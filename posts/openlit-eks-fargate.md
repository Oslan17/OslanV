# Self-Hosting OpenLIT on EKS Fargate: GenAI Observability with Full GitOps

Our AI teams kept asking the same question nobody could answer: *how much does each LLM-powered app actually cost us, per model, per request?* We had plenty of infrastructure observability, but zero visibility into prompts, tokens, and spend. This post covers how I deployed [OpenLIT](https://openlit.io) — an OpenTelemetry-native GenAI observability platform — on EKS Fargate, delivered end-to-end with GitOps, and the very real gotchas I hit along the way.

## What OpenLIT gives you

Applications instrumented with the OpenLIT SDK emit OTLP telemetry. OpenLIT stores it in ClickHouse and visualizes traces, token usage, latency, and **cost attribution per application and model**. The instrumentation is genuinely one line:

```python
import openlit  # pip install openlit

openlit.init(
    otlp_endpoint="http://openlit.observability.svc.cluster.local:4318",
    application_name="my-llm-app",
    environment="production",
)
```

That single call auto-instruments OpenAI, Anthropic, Bedrock, LangChain, Ollama, vector DBs, and more. No further code changes.

## Architecture

```
AI apps (SDK / OTLP) ──► openlit svc :4318 (embedded OTel collector)
EC2 apps (outside EKS) ──► internal ALB host rule ──► openlit svc :4318
                              │
                              ▼
                    StatefulSet openlit (UI/API, Fargate)
                              │
                              ▼
                    StatefulSet openlit-db (ClickHouse, official image, Fargate)
                              │
                    EFS static PVs (telemetry + UI SQLite)

Users (VPN) ──► openlit.internal.example.com ──► internal ALB ──► openlit :3000
```

Key decisions:

- **Bundled ClickHouse with the official image.** The chart can point at an external ClickHouse, but we chose `clickhouse.enabled: true` with `clickhouse/clickhouse-server` pinned to an LTS tag. Why not Bitnami? Because Broadcom removed the versioned Bitnami tags from Docker Hub in 2025 — our first attempt died with `ErrImagePull` on images that had simply ceased to exist. The frozen `bitnamilegacy` mirror gets no CVE patches. Pin official images.
- **Everything on Fargate.** No nodes to manage, but it constrains storage (EFS only) and rules out DaemonSets.
- **Vendored chart.** We commit the upstream chart at a pinned version plus our own templates on top. Upgrades become a reviewable diff.

## The hard part: persistent storage on Fargate

Fargate only supports EFS, and only via **static provisioning**. The OpenLIT chart uses `volumeClaimTemplates` in its StatefulSets, so you can't just hand it an `existingClaim`. The trick is one StorageClass per volume, each matching a pre-created PV:

```yaml
kind: StorageClass
apiVersion: storage.k8s.io/v1
metadata:
  name: openlit-db-sc
provisioner: efs.csi.aws.com
---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: openlit-db-pv
spec:
  capacity:
    storage: 50Gi
  accessModes: [ReadWriteMany]
  persistentVolumeReclaimPolicy: Retain
  storageClassName: openlit-db-sc
  csi:
    driver: efs.csi.aws.com
    volumeHandle: "fs-0123456789abcdef0:/openlit/clickhouse"   # EFS id + subpath
```

The PVC created by the volumeClaimTemplate requests `storageClassName: openlit-db-sc`, finds exactly one matching PV, and binds. Same pattern for the UI's SQLite volume (`/openlit/data` subpath on the same filesystem).

**Catch:** EFS subpaths must exist before the pod mounts them. I solved it with a small Job that mounts the EFS root and runs `mkdir -p`, ordered with ArgoCD sync waves:

- wave -3: StorageClasses, PVs, root-mount PVC
- wave -2: the `setup-permissions` Job (regular resource, *not* a hook — hooks run before the PVC they need exists on a first sync)
- wave -1: the credentials Secret
- wave 0: StatefulSets

ArgoCD waits for each wave to be healthy before applying the next, so the first sync works with no chicken-and-egg.

## Secrets: Vault + ArgoCD Vault Plugin

ClickHouse credentials never touch git. A plain manifest carries an AVP annotation and placeholders:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: openlit-clickhouse
  annotations:
    avp.kubernetes.io/path: "secrets/data/openlit"
stringData:
  username: <username>
  password: <password>
```

The ArgoCD Vault Plugin resolves the placeholders at render time. Both the ClickHouse StatefulSet and the UI consume the same Secret.

**Lesson learned the hard way:** the OpenLIT UI builds a connection URL like `http://user:password@host:port/db`. If your generated password contains `+` or `/` (hello, base64), the URL parser chokes with `ClickHouse URL is malformed`. Generate URL-safe passwords: `openssl rand -hex 16`.

## Exposure: one ALB, host-based routing

We reused the existing internal ALB (aws-load-balancer-controller) with host rules — no new load balancer, no public exposure:

- `openlit.internal.example.com` → service `openlit:3000` (the UI, VPN users)
- `openlit-otlp.internal.example.com` → service `openlit:4318` (OTLP for EC2 workloads *outside* the cluster)

That second rule matters: `*.svc.cluster.local` doesn't resolve outside Kubernetes, so VMs need a routable name. The ALB is internal (private IPs), so nothing is reachable from the internet — the trust boundary is the VPC/VPN, and OTLP ingest needs no credentials.

## Gotchas that will bite you

| Symptom | What's happening |
|---|---|
| `FailedScheduling: PVC not bound` and the pod stays Pending forever | The Fargate scheduler rejected the pod before the PVC bound — and it **does not retry**. Delete the pod; the StatefulSet recreates it and it schedules fine. |
| `FailedMount: driver efs.csi.aws.com not found` | Transient on Fargate first mounts. It self-resolves. Don't chase it. |
| OpAMP `tls: certificate required` spam in the UI logs | The embedded collector's management channel retrying. Harmless — ingest is unaffected (verify with a POST to `/v1/traces`; you want `{"partialSuccess":{}}`). |
| UI error about `username` being undefined after login | Accounts created via Sign Up have no Database Config attached. Add one under Settings and share it with new users. |
| Whitespace in UI form fields | A leading space in a hostname or username field produces baffling auth/URL errors. Trim your paste. |

## Smoke test

Before onboarding anyone, prove the pipeline end-to-end:

```bash
curl -s -X POST http://openlit.observability.svc.cluster.local:4318/v1/traces \
  -H 'Content-Type: application/json' -d '{"resourceSpans":[]}'
# {"partialSuccess":{}}  ← collector is up and accepting
```

Then send a real span (or use the SDK with `disable_batch=True` in a short script) and confirm the row lands in ClickHouse and renders in the UI. Only then hand the endpoint to app teams.

## Results

- One line of code per application → automatic traces, tokens, latency, and cost per model
- ~2 Fargate pods + EFS pay-per-GB per environment — roughly the cost of a couple of lattes per day
- Zero secrets in git, full GitOps delivery, reproducible across environments with a values file

The AI teams got their cost visibility. I got a healthy respect for Fargate storage semantics and a permanent habit of checking image registries before trusting a chart's defaults.

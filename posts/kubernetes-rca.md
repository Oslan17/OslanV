# Kubernetes RCA Practice: Sidecar CPU Spike & Liveness Probe Loop

This is a structured post-mortem on a simulated incident I use for RCA practice. The scenario: a flash sale triggers a CPU spike in a metrics sidecar, which causes liveness probe failures, which causes cascading pod restarts under load. A classic failure mode.

## The Scenario

- **Service:** `checkout-api` — 3 replicas, HPA configured
- **Sidecar:** `metrics-exporter` — scrapes app metrics, pushes to Prometheus
- **Trigger:** Flash sale causes 10x traffic increase over 90 seconds

## Timeline

| Time | Event |
|------|-------|
| 14:00 | Flash sale starts, traffic spikes |
| 14:02 | `metrics-exporter` CPU usage jumps from 50m to 950m (limit: 100m) |
| 14:03 | Pod CPU throttling kicks in — sidecar slows down |
| 14:04 | Liveness probe starts timing out (probe hits `/health` on main container, but response is delayed by shared CPU contention) |
| 14:05 | Kubernetes restarts pod — new pod has cold start latency |
| 14:05 | HPA triggers scale-out, but pod startup takes 45s |
| 14:06 | 2 of 3 replicas restarting simultaneously — service degraded |
| 14:08 | Traffic drops slightly, surviving replica recovers |
| 14:12 | All replicas healthy, incident over |

**Total duration:** 12 minutes of degraded service.

## Root Cause

The root cause was a **misconfigured CPU limit on the sidecar container**. The `metrics-exporter` had a 100m CPU limit, which was fine under normal load but completely insufficient under high scrape frequency triggered by the traffic spike.

The contributing factor: **shared resource contention**. In Kubernetes, CPU limits apply at the cgroup level for the entire pod. When the sidecar was throttled, it introduced latency into the shared network namespace, which delayed `/health` responses from the main container.

The liveness probe had no tolerance for this:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 2    # ← too tight
  failureThreshold: 1  # ← too aggressive
```

A 2-second timeout with a failure threshold of 1 means a single slow health check kills the pod.

## The Fix

### 1. Increase sidecar CPU limits (and set proper requests)

```yaml
resources:
  requests:
    cpu: 50m
    memory: 64Mi
  limits:
    cpu: 500m    # was 100m
    memory: 128Mi
```

**Important:** Setting `requests` equal to `limits` prevents the scheduler from over-committing this container on saturated nodes.

### 2. Loosen the liveness probe

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 15
  periodSeconds: 10
  timeoutSeconds: 5      # was 2
  failureThreshold: 3    # was 1
```

A failure threshold of 3 with a 10-second period means the pod tolerates up to 30 seconds of probe failures before being restarted. That's usually enough to ride out a transient spike.

### 3. Separate the readiness and liveness concerns

Liveness should only restart the pod if the app is genuinely hung (not responsive at all). Readiness should control whether the pod receives traffic.

```yaml
livenessProbe:
  httpGet:
    path: /healthz     # lightweight — just returns 200
    port: 8080
  failureThreshold: 5
  periodSeconds: 15

readinessProbe:
  httpGet:
    path: /ready       # checks DB connection, cache, etc.
    port: 8080
  failureThreshold: 2
  periodSeconds: 5
```

This way, a degraded pod stops receiving traffic (readiness fails) without being killed and restarted (liveness still passes).

### 4. PodDisruptionBudget to prevent simultaneous restarts

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: checkout-api-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: checkout-api
```

This ensures Kubernetes will never take more than one replica down at a time voluntarily, whether from a rollout, node drain, or eviction.

## Lessons

1. **Sidecars are not free** — they share CPU, memory, and network namespace with the main container. Size them properly
2. **Probe defaults are wrong** — the Kubernetes defaults (`failureThreshold: 3`, `timeoutSeconds: 1`) are often too tight for real workloads
3. **Test under load** — these issues rarely surface in staging. Load test with a traffic profile that matches your worst-case scenario
4. **Separate liveness from readiness** — conflating them turns transient slowness into avoidable restarts

The 12-minute incident would have been a 30-second traffic dip if the liveness probe had been configured with a realistic failure threshold.

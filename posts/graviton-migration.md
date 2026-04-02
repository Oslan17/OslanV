# Graviton Migration on EKS & RDS: What You Actually Save

Everyone talks about Graviton savings in theory. This post is about what we measured in practice — real numbers from a production EKS cluster and multi-AZ RDS PostgreSQL instance.

## Our Starting Point

- EKS cluster with `m5.large` and `r5.large` node groups
- RDS PostgreSQL 14, `db.r5.xlarge`, Multi-AZ
- Workloads: Node.js APIs, Python workers, Odoo (PHP/Python)

## RDS: The Quick Win

RDS Graviton migration is the easiest place to start. AWS maintains separate pricing for `r6g` vs `r5` instances, and the switch is a few clicks (or a Terraform variable change).

```hcl
resource "aws_db_instance" "main" {
  instance_class = "db.r6g.xlarge"  # was db.r5.xlarge
  # everything else stays the same
}
```

**What we saved:** `db.r5.xlarge` on-demand in us-east-1 costs $0.48/hr. `db.r6g.xlarge` costs $0.384/hr. That's **20% cheaper** for the same memory and similar CPU performance.

For a Multi-AZ setup with a read replica, the savings multiply. We went from ~$840/month to ~$672/month just on the database.

> **Note:** Check your PostgreSQL version first. Graviton requires PostgreSQL 12.3+ and a minor version upgrade may be needed.

## EKS: Where It Gets Interesting

EC2 savings on Graviton are larger but depend heavily on your workload type. ARM performance is especially strong for memory-bandwidth-heavy tasks (in-memory caches, data processing) and multi-threaded I/O workloads.

### Evaluation with Compute Optimizer

Before changing anything, we ran AWS Compute Optimizer and filtered for Graviton recommendations:

```bash
aws compute-optimizer get-ec2-instance-recommendations \
  --filters name=finding,values=OVER_PROVISIONED,NOT_OPTIMIZED \
  --query 'instanceRecommendations[*].{Instance:instanceName,Current:currentInstanceType,Recommended:recommendationOptions[0].instanceType}'
```

Most of our `m5.large` nodes were recommended to move to `m6g.large`. The price difference:

| Instance | vCPU | Memory | Price (on-demand) |
|----------|------|--------|-------------------|
| m5.large | 2 | 8 GB | $0.096/hr |
| m6g.large | 2 | 8 GB | $0.077/hr |

That's **~20% cheaper**, and in our benchmarks the m6g was actually faster for our Python workloads.

### Karpenter for Automatic Node Selection

Instead of static node groups, we use Karpenter with a NodePool that prefers Graviton:

```yaml
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: default
spec:
  template:
    spec:
      requirements:
        - key: kubernetes.io/arch
          operator: In
          values: ["arm64", "amd64"]   # arm64 preferred via weight
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot", "on-demand"]
        - key: node.kubernetes.io/instance-type
          operator: In
          values: ["m6g.large", "m6g.xlarge", "m6i.large", "m6i.xlarge"]
  limits:
    cpu: "100"
  disruption:
    consolidationPolicy: WhenUnderutilized
```

Karpenter will prefer `m6g` (Graviton) instances when available and fall back to `m6i` if needed. This removed the need to manage separate node groups entirely.

### Multi-Arch Container Images

The main blocker for Graviton adoption is container images. You need multi-arch builds.

```dockerfile
# Build for both platforms
# docker buildx build --platform linux/amd64,linux/arm64 -t myapp:latest --push .
```

In our CI (GitHub Actions):

```yaml
- name: Build and push multi-arch image
  uses: docker/build-push-action@v5
  with:
    platforms: linux/amd64,linux/arm64
    push: true
    tags: ${{ env.IMAGE_TAG }}
```

Any third-party images that don't have `arm64` variants are the real constraint. In our case, one internal service used a C extension that wasn't compiled for ARM. We containerized it separately and kept it on `amd64` nodes using a `nodeAffinity` rule.

## Summary of Savings

| Component | Before | After | Saving |
|-----------|--------|-------|--------|
| RDS (db.r5.xlarge Multi-AZ + replica) | $840/mo | $672/mo | 20% |
| EKS nodes (8x m5.large) | $552/mo | $445/mo | 19% |
| **Total** | **$1,392/mo** | **$1,117/mo** | **~$275/mo** |

Not life-changing for a small cluster, but at scale these percentages add up. A larger cluster running dozens of nodes sees proportionally larger savings.

## Recommendations

1. **Start with RDS** — zero code changes, easy rollback
2. **Use Compute Optimizer** before guessing instance types
3. **Build multi-arch images early** — it's a CI pipeline change, not a production change
4. **Let Karpenter choose** — static node groups for Graviton are a maintenance burden

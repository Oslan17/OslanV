# Migrating EKS from Fargate to EC2 Node Groups: A 4-Phase Approach

Fargate on EKS is a great starting point — no node management, no AMI patching, and easy scaling. But as workloads grow, the limitations start to surface. This post covers why we migrated, how we planned it safely, and the specific gotchas around security groups with RDS, ElastiCache, and MSK.

## Why We Left Fargate

Our production cluster was running ~40 pods across several namespaces. The pain points that drove the decision:

- **No DaemonSet support** — we couldn't run node-level agents (Datadog, Fluent Bit) without sidecars in every pod
- **Security group complexity** — Fargate pods use separate ENIs, which made RDS/ElastiCache SG rules messy to maintain
- **Cost** — EC2 node groups with Karpenter gave us ~35% savings on burstable workloads
- **No Graviton support at the time** — we couldn't take advantage of ARM-based instances

## The 4-Phase Plan

A hard cutover was not an option. We needed zero downtime and a clean rollback path.

### Phase 1 — Provision EC2 Node Groups in Parallel

We added EC2 node groups alongside the existing Fargate profiles. No workloads were moved yet. This let us validate networking, IAM roles, and node readiness without any production impact.

```hcl
resource "aws_eks_node_group" "app" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "app-nodes"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.private_subnet_ids

  instance_types = ["m6g.large"]  # Graviton

  scaling_config {
    desired_size = 3
    min_size     = 2
    max_size     = 10
  }
}
```

### Phase 2 — Migrate Non-Critical Workloads

We started with stateless, non-customer-facing services (internal tools, cron jobs, staging replicas). This validated the node configuration and surfaced any resource limit differences between Fargate and EC2.

Key difference to watch: **Fargate enforces memory limits strictly**. On EC2, pods may consume more than their `requests` if the node has headroom. We found two services that were quietly over-consuming on EC2 but had been throttled on Fargate.

### Phase 3 — Security Group Refactoring

This was the most work. On Fargate, each pod gets its own ENI with a dedicated security group. On EC2, pods share the node's primary security group (unless you use security groups for pods, which we did not).

**The fix for RDS:** Instead of allowing the Fargate pod SG individually, we created a single `eks-nodes-sg` group and updated the RDS inbound rule to reference it.

```
Before: allow from sg-0abc123 (fargate-pod-sg)
After:  allow from sg-0def456 (eks-nodes-sg)
```

Same pattern for ElastiCache and MSK. We applied the SG changes before moving traffic so there was no connectivity gap.

### Phase 4 — Drain Fargate & Remove Profiles

Once all workloads were stable on EC2 nodes for 72 hours:

1. Added `nodeAffinity` rules to prevent any rescheduling on Fargate
2. Deleted Fargate profiles one namespace at a time
3. Monitored error rates and latency in Grafana throughout

```yaml
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
        - matchExpressions:
            - key: eks.amazonaws.com/compute-type
              operator: NotIn
              values: ["fargate"]
```

## Results

| Metric | Fargate | EC2 (Graviton) |
|--------|---------|----------------|
| Monthly cost | $1,240 | $820 |
| DaemonSet support | ❌ | ✅ |
| Node-level visibility | ❌ | ✅ |
| SG management | Complex | Straightforward |

The migration took three weeks from planning to completion. The parallel approach was worth the extra time — we had zero incidents.

## Key Takeaways

- Run phases in parallel, never cut over cold
- Audit your resource limits before migrating — Fargate's strict enforcement may be masking over-consumption
- Refactor security groups *before* moving traffic, not after
- Use Karpenter instead of managed node groups if you want bin-packing and automatic Graviton selection

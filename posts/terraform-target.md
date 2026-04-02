# Terraform -target: When to Use It (and When to Run Away)

`terraform -target` is one of those flags that feels like a lifesaver in the moment and a landmine six months later. This post covers the cases where it genuinely solves a real problem, and the cases where it's just delaying the pain.

## What -target Actually Does

`-target` tells Terraform to only plan and apply changes to a specific resource and its direct dependencies. Everything else is ignored — Terraform won't even diff it.

```bash
terraform apply -target=aws_iam_openid_connect_provider.eks
```

The danger: Terraform's state now reflects partial reality. Resources that *should* have been updated weren't, and Terraform has no record of that debt.

## Case 1: OIDC Provider Circular Dependency

This is the most legitimate use case I've hit in production. When bootstrapping an EKS cluster with an OIDC provider, you sometimes get a circular dependency:

- The OIDC provider needs the cluster's OIDC issuer URL
- The IAM role for the cluster (IRSA) needs the OIDC provider ARN
- Terraform tries to create both at once and fails

The fix is to apply the cluster first, then the OIDC provider:

```bash
# Step 1: create the cluster and node groups
terraform apply -target=module.eks

# Step 2: create the OIDC provider (now the issuer URL exists)
terraform apply -target=aws_iam_openid_connect_provider.eks

# Step 3: apply everything else normally
terraform apply
```

This is safe because you're doing a controlled three-step apply where each step leaves the state consistent.

## Case 2: Route53 Record Conflicts

If you're importing or recreating a hosted zone that already has records, Terraform will sometimes try to delete and recreate records in an order that breaks DNS.

Targeting individual records during a migration lets you stage the changes:

```bash
terraform apply -target=aws_route53_record.api_cname
```

Again, safe because it's a controlled sequence, and you follow up with a full `terraform apply` once you're done.

## When NOT to Use -target

### Debugging "why is this failing"

If your plan is failing and you think "I'll just skip that resource for now," stop. The failure is telling you something. `-target` hides the symptom, it doesn't fix the cause.

### Speeding up applies

Some people use `-target` to avoid waiting for a full plan on large configs. This is how drift accumulates. A resource that "wasn't touched" today may have been implicitly affected by a dependency change that Terraform never evaluated.

### Working around state drift

If your state is drifted and a targeted apply "fixes" one resource, the drift still exists everywhere else. Run `terraform plan` to see the full picture, then address the actual drift.

## The Hidden Cost: Partial State

Here's the scenario that burns teams:

1. Dev uses `-target` to apply a security group change quickly
2. The apply succeeds, state is updated for that resource
3. Other dependent resources (e.g., EC2 instances referencing that SG) are now out of sync
4. Next full `terraform apply` shows unexpected changes
5. Someone panics and uses `-target` again
6. Repeat until the state is a mess

The fix is always the same: run a full `terraform plan`, understand every change in the diff, and apply everything together.

## The Rule I Follow

> Use `-target` only when you have a deliberate, documented bootstrap sequence where each targeted apply leaves state fully consistent, and you immediately follow up with a full `terraform apply` to verify nothing is out of sync.

If you can't clearly explain why the targeted apply is safe and how you'll clean it up — reach for something else first.

## Alternatives Worth Knowing

- **`terraform import`** — for bringing existing resources under management without creating them
- **`depends_on` in modules** — for explicit ordering that eliminates the need for manual sequencing
- **`-replace`** — for forcing recreation of a specific resource cleanly
- **`terraform state mv`** — for refactoring resource addresses without destroying/recreating

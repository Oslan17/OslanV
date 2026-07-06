# SOC 2 from the Platform Side: What Compliance Actually Means for a DevOps Engineer

When people hear "SOC 2" they picture auditors, spreadsheets, and policy documents. What they don't picture is a DevOps engineer refactoring IAM policies at 6 PM. Having supported SOC 2 compliance work from the platform side, I want to demystify what the audit actually demands from infrastructure — because most of it is just good engineering with receipts.

## SOC 2 in one paragraph

SOC 2 is an attestation (not a certification stamp you buy) that your organization's controls meet the Trust Services Criteria — Security is mandatory; Availability, Confidentiality, Processing Integrity, and Privacy are optional add-ons. A Type I report says your controls are *designed* correctly at a point in time; a Type II says they *operated effectively* over a period (usually 6–12 months). That "over a period" part is what changes your life as a platform engineer: it's not about passing a scan once, it's about **evidence that the right thing happened every time, all year**.

## What the auditor actually asks the platform team

Auditors don't read your Terraform. They ask questions like "how do you ensure only authorized personnel can access production?" and you have to map that to controls you can demonstrate. In practice, the platform-side asks cluster into five buckets:

### 1. Access control & least privilege

- **IAM roles scoped to what each workload needs** — no wildcard `*` policies, no shared credentials. IRSA (IAM Roles for Service Accounts) on EKS is your friend: each pod gets exactly the AWS permissions it needs and nothing else.
- **Human access through SSO + MFA**, with role assumption instead of long-lived keys. Every `AssumeRole` lands in CloudTrail — that *is* your evidence.
- **The uncomfortable audit finding**: that convenience IAM user from 2022 with an access key that never rotated. Kill those before the auditor finds them.

### 2. Secrets management

- **No secrets in git. Ever.** We centralized on HashiCorp Vault, with the ArgoCD Vault Plugin resolving placeholders at deploy time — manifests in git carry `<password>` tokens, never values.
- Scoped Vault policies per consumer (an app's CI role can read its own path, nothing else).
- Rotation needs to be *possible and boring*: if rotating a database password requires a war room, you'll never do it, and the auditor will ask when you last did.

### 3. Encryption everywhere

- **At rest**: EBS/EFS/S3/RDS encryption on by default — most of it is a single Terraform argument (`encrypted = true`) that costs nothing and saves an audit finding.
- **In transit**: TLS terminated at load balancers with managed certs (ACM), internal service traffic inside a private VPC.
- The evidence is trivially queryable: `aws efs describe-file-systems --query '...Encrypted'` across every resource, exported and attached.

### 4. Change management — where GitOps quietly wins the audit

This is the bucket where a good platform pays for itself. The control says: *changes to production are reviewed, approved, and traceable.* If your delivery is GitOps, you already have it:

- Every infra change is a **pull request** → review + approval is enforced by branch protection, not by policy documents.
- **Terraform plans posted to the PR** (we use Atlantis) → the reviewer sees exactly what will change before approving.
- **ArgoCD syncs from main** → what runs in the cluster *is* what was reviewed. Drift detection flags anything applied out-of-band.
- The git history + PR trail **is the evidence**. No screenshots, no reconstruction — `git log` and the PR list are the audit artifact.

If you're doing kubectl-apply-from-laptop deployments, SOC 2 is going to hurt. If you're doing GitOps, you mostly have to *show* what you already do.

### 5. Logging, monitoring & resilience

- **Audit logging on**: CloudTrail across all accounts, EKS control-plane logs, ALB access logs — retained and immutable.
- **Backups that are automatic and verifiable**: AWS Backup policies attached by Terraform to every stateful resource (`for_each` over the resource list means a new EFS volume gets a backup policy on the same apply that creates it — the control is structural, not procedural).
- **Alerting with an on-call path**, and post-incident reviews written down. Availability criteria care less about your uptime number and more about whether you *detect, respond, and learn*.

## The mindset shift

The real work of SOC 2 isn't implementing controls — a decent platform already has most of them. The work is making them **provable**:

1. **Automate the control, not the task.** A backup policy applied by `for_each` in Terraform can't be forgotten for the next resource. A runbook step can.
2. **Prefer structural evidence over collected evidence.** Branch protection settings, IAM policy JSON, and encryption flags are queryable any day of the year. Screenshots go stale the moment you take them.
3. **Treat audit findings like incident post-mortems.** No blame, fix the class of problem, not the instance.

## What I'd tell past-me

- Start the least-privilege IAM cleanup *months* before the audit window. It's the slowest, most political workstream.
- Put secrets management in place before someone asks — retrofitting Vault into twenty services during an observation period is misery.
- Write down the things you already do. Half of "compliance work" is documenting real, existing practice so an outsider can verify it.

SOC 2 gets framed as bureaucracy, but from the platform side it's mostly a forcing function for the hygiene you wanted anyway: least privilege, no secrets in git, encrypted everything, reviewed changes, tested backups. The audit just makes sure you can prove it.

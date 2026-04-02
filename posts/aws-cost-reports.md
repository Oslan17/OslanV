# Building Multi-Account AWS Cost Reports with Python & ReportLab

Finance teams love dashboards, but they love PDFs more. Every month our CFO asked for a formatted breakdown of AWS spend across our production and non-production accounts. After one too many manual exports from Cost Explorer, I automated the whole thing with Python, boto3, and ReportLab.

## The Goal

Generate a branded, multi-page PDF that shows:

- Total spend per account for the current and previous month
- Cost breakdown by service (EC2, RDS, EKS, etc.)
- EKS optimization events (Karpenter scale-downs, Spot interruptions)
- Partial-month highlighting when comparing incomplete months

## Architecture

```
AWS Cost Explorer API
        │
        ▼
  boto3 (Python)
        │
        ▼
  Data transformation
        │
        ▼
  ReportLab PDF generation
        │
        ▼
  S3 upload + SNS notification
```

## Fetching Costs with boto3

The Cost Explorer API is straightforward but has a few quirks — the date range is exclusive on the end date, and you need to specify granularity carefully.

```python
import boto3
from datetime import date, timedelta

def get_monthly_costs(account_id: str, start: str, end: str) -> dict:
    ce = boto3.client("ce", region_name="us-east-1")

    response = ce.get_cost_and_usage(
        TimePeriod={"Start": start, "End": end},
        Granularity="MONTHLY",
        Filter={"Dimensions": {"Key": "LINKED_ACCOUNT", "Values": [account_id]}},
        GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}],
        Metrics=["UnblendedCost"],
    )

    costs = {}
    for group in response["ResultsByTime"][0]["Groups"]:
        service = group["Keys"][0]
        amount  = float(group["Metrics"]["UnblendedCost"]["Amount"])
        costs[service] = round(amount, 2)

    return costs
```

## Handling Partial Months

When generating a mid-month report, comparing this month's spend to last month's total is misleading. We apply a daily run-rate projection:

```python
def project_monthly_cost(current_spend: float, day_of_month: int) -> float:
    days_in_month = 30  # approximation
    daily_rate = current_spend / day_of_month
    return round(daily_rate * days_in_month, 2)
```

In the PDF, partial months get a yellow highlight and a footnote explaining the projection.

## Generating the PDF with ReportLab

ReportLab is verbose but gives you pixel-perfect control. The key is defining styles once and reusing them.

```python
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet

BRAND_DARK  = colors.HexColor("#0b0e14")
BRAND_CYAN  = colors.HexColor("#00d4ff")
BRAND_MUTED = colors.HexColor("#64748b")

def build_cost_table(data: list[list]) -> Table:
    table = Table(data, colWidths=[250, 100, 100])
    table.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0),  BRAND_DARK),
        ("TEXTCOLOR",   (0, 0), (-1, 0),  BRAND_CYAN),
        ("FONTNAME",    (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("LEFTPADDING",  (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING",   (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
    ]))
    return table
```

## Automating Delivery

The script runs as an AWS Lambda on a monthly schedule (EventBridge):

1. Fetch costs for all accounts via Organizations API
2. Generate PDF in `/tmp`
3. Upload to S3 (`cost-reports/2025-03/report.pdf`)
4. Send SNS notification with a pre-signed URL

```python
def upload_and_notify(pdf_path: str, month: str) -> str:
    s3 = boto3.client("s3")
    key = f"cost-reports/{month}/report.pdf"
    s3.upload_file(pdf_path, BUCKET_NAME, key)

    url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": BUCKET_NAME, "Key": key},
        ExpiresIn=604800,  # 7 days
    )

    boto3.client("sns").publish(
        TopicArn=SNS_TOPIC_ARN,
        Subject=f"AWS Cost Report — {month}",
        Message=f"Monthly report ready: {url}",
    )
    return url
```

## Results

Before: 45 minutes of manual work per month.  
After: fully automated, delivered by 8 AM on the 1st.

The finance team now gets consistent, branded reports without any engineering involvement. The code lives in a Lambda zip deployed via Terraform.

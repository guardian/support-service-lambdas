## 🔁 Scheduled job writing off unbalanced invoices left over after cancellations

A scheduled job that automatically writes off unbalanced invoices left behind after incomplete subscription cancellations.

## 🔍 Logic

- Target only recent cancellations—specifically those that occurred 1 to 5 days ago.
- Identify all unbalanced invoices linked to these cancelled subscriptions, whether or not the invoices were directly tied to the cancellation.

## 🕐 Schedule

The job runs daily at 5:00 AM.

## 🔧 API Used

The invoice adjustment is done via the Zuora Action POST Create API:: https://developer.zuora.com/v1-api-reference/api/operation/Action_POSTcreate/.

## 🧾 Background & Context

This job addresses unbalanced invoices left by three known sources:

- **MMA**: The MMA cancellation process may leave positive invoices behind if a payment failed. These are now written off.
- **Autocancel**: The auto-cancel process can cancel a subscription but fail to balance positive and negative invoices. These are also written off.
- **Salesforce/UI**: Manual cancellations done via Salesforce or the Zuora UI may leave leftover invoices. These are included as well.

## 📌 Future Considerations

Once the upstream systems (MMA, Autocancel, Salesforce) are updated to correctly zero out invoice balances at cancellation time, this job will no longer be necessary.

## 🧩 Architecture Overview

This job is implemented using AWS Step Functions with two main steps:

### 1. 📥 Invoice Fetch (Lambda Function)

- Queries BigQuery to find all unbalanced invoices related to recent cancellations (within the past 1–5 days).
- Saves the result as a JSON file in S3 ([write-off-unpaid-invoices-prod](https://eu-west-1.console.aws.amazon.com/s3/buckets/write-off-unpaid-invoices-prod?region=eu-west-1&tab=objects&bucketType=general)).

### 2. 🔁 Invoice Write-Off (Distributed Map + Lambda)

- A Distributed Map state reads the JSON file from S3 and processes invoices in batches of 100.
- Each batch is passed to a Lambda function, which:
  - Iterates over the invoices in the batch.
  - For each invoice, uses the [Zuora Action POST Create API](https://developer.zuora.com/v1-api-reference/api/operation/Action_POSTcreate/) to adjust invoice items until the balance reaches zero.

This architecture ensures efficient, parallel processing at scale while staying within Lambda and API limits.

<img width="1013" alt="diagram" src="https://github.com/user-attachments/assets/6eb80279-1de2-41e5-92ed-2e06dc797e03" />

### 🚨 Monitoring & Alerts

If the Step Function execution fails, a CloudWatch alarm is triggered.

This alarm is integrated with our Guardian centralised alerting system, which sends a notification directly to Google Chat.

This ensures any unexpected failures are promptly visible and can be actioned quickly.

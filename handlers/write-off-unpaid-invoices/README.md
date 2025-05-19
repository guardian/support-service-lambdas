# Write off unpaid invoices

This is an automated process to write off thousands of invoices using AWS Step Functions with a **Distributed Map State**. The system is designed to process large volumes of invoice records stored in CSV files located in the S3 bucket: [write-off-unpaid-invoices-prod](https://eu-west-1.console.aws.amazon.com/s3/buckets/write-off-unpaid-invoices-prod?region=eu-west-1&bucketType=general&tab=objects).

## Supported Strategies

The process currently supports two remediation strategies:

---

### 1. Write off invoices (API Call)

This strategy makes an [API call](https://developer.zuora.com/v1-api-reference/api/operation/PUT_WriteOffInvoice/) to write off unpaid invoices directly.

#### Example Input

```json
{
	"Comment": "MMA cancellation process leaving behind positive invoices if there was a payment failure. Write-off processed for the uncollectible invoices.",
	"ReasonCode": "Write-off",
	"FilePath": "batches/batch4.csv",
	"RemediationStrategy": "WriteOffInvoices"
}
```

### 2. Create Invoice Item Adjustments

This strategy creates [invoice item adjustments](https://developer.zuora.com/v1-api-reference/older-api/operation/Object_POSTInvoiceItemAdjustment/) for invoices that cannot be written off directly.

#### Example Input

```json
{
	"Comment": "Invoices left over after manual cancellation made in Salesforce or Zuora UI.",
	"ReasonCode": "Write-off",
	"FilePath": "batches/batch6.csv",
	"RemediationStrategy": "CreateInvoiceItemAdjustments"
}
```

## Input Explanation

Each input JSON contains:

- Comment: A description of why the write-off or adjustment is necessary.

- ReasonCode: The reason code to be applied to the remediation.

- FilePath: The path of the CSV file inside the S3 bucket `write-off-unpaid-invoices-prod`.

- RemediationStrategy: Determines which remediation logic to apply.

## Process Overview

- The first Lambda function receives the input and determines the correct remediation strategy using the `RemediationStrategy` field.

- The Distributed Map State reads and processes the specified CSV file.

- Each record is processed according to the selected strategy.

## Failure Handling

Failures are expected during processing.

The [Step Function](https://eu-west-1.console.aws.amazon.com/states/home?region=eu-west-1#/statemachines/view/arn%3Aaws%3Astates%3Aeu-west-1%3A865473395570%3AstateMachine%3Awrite-off-unpaid-invoices-PROD?type=standard) is configured with a 100% error tolerance threshold in order to attempt every row in the CSV file.

You must manually review the Map Run results to identify any failures.

## Notes

This system is designed for large-scale write-off operations.

Ensure that the input files are formatted correctly and stored in the expected S3 path.

Keep all comments and reason codes clear for audit and tracking purposes.

# supporter-product-data-lambdas
This project contains the Supporter Product Data sync pipeline. It runs a Step Functions state machine to:
1) query Zuora for changed subscriptions (incremental or full)
2) upload the export to S3
3) enqueue rate plan items to SQS
4) process SQS messages and write to the SupporterProductData DynamoDB table.
## How to test
- Unit tests: `pnpm --filter supporter-product-data-lambdas test`
- Integration tests: `pnpm --filter supporter-product-data-lambdas it-test`

## Downloading query results locally
`download-query-results` is a helper script that runs the same `select-active-rate-plans`
query used by the pipeline against Zuora, waits for the batch job to complete, and
downloads the CSV export to a local file (instead of uploading it to S3).

```bash
pnpm --filter supporter-product-data-lambdas download-query-results <CODE|PROD> <full|incremental> [outputPath]
```
- `STAGE` (required): `CODE` or `PROD`. Controls which Zuora config and catalog are used.
- `queryType` (optional, default `full`): `full` queries all subscriptions; `incremental`
  queries from the last successful query time in SSM.
- `outputPath` (optional): where to write the CSV. Defaults to
  `select-active-rate-plans-<STAGE>-<timestamp>.csv` in the current directory.

The script reads Zuora credentials and config from AWS (SSM/S3/Secrets Manager), so you
must have credentials for the relevant account (e.g. via Janus) before running it.

## Infrastructure Diagram
<img src="infrastructure_diagram.jpg" alt="infrastructure_diagram.jpg" width="600">

## Flowchart For The Process Item Lambda
<img src="process_item_flowchart.jpg" alt="process_item_flowchart.jpg" width="400">

## References
- Google slides: https://docs.google.com/presentation/d/1WNN-JRgHiE7Hap_zPs81UmUal2Jl7ssjCFGv5xgR2XE/edit#slide=id.p
- Infrastructure Diagram & Flowchart: https://miro.com/app/board/uXjVHESx60U=/?focusWidget=3458764675896064104
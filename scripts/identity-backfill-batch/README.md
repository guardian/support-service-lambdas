# identity-backfill-batch

CLI tool to backfill missing IdentityIds in bulk by calling the `identity-backfill`
API for each row in a CSV produced by the BigQuery query in the Trello card
"Backfill Subscriptions missing Identity ID".

The tool only knows about the `identity-backfill` API. All the work
(Identity, Zuora, Salesforce, SQS) is done inside the lambda itself.

## Setup

You need the API URL and API key for the stage you target. Both come from AWS
API Gateway with the `membership` profile.

```sh
# CODE
export IDENTITY_BACKFILL_URL_CODE="https://$(aws --profile membership --region eu-west-1 \
  apigateway get-rest-apis --query "items[?name=='identity-backfill-api-CODE'].id" \
  --output text).execute-api.eu-west-1.amazonaws.com/CODE/identity-backfill"

export IDENTITY_BACKFILL_API_KEY_CODE="$(aws --profile membership --region eu-west-1 \
  apigateway get-api-keys --name-query identity-backfill-api-key-CODE \
  --include-values --query 'items[0].value' --output text)"
```

Same pattern for `PROD`.

## Run

```sh
pnpm --filter identity-backfill-batch run -- \
  --stage CODE \
  --csv ~/Downloads/missing_identity.csv \
  --rps 5 \
  --dry-run-only \
  --limit 10
```

### Args

| Arg | Required | Default | Notes |
|-----|----------|---------|-------|
| `--stage CODE\|PROD` | yes | - | Selects which env vars are read |
| `--csv <path>` | yes | - | CSV with the columns produced by the BQ query |
| `--rps <n>` | no | `5` | Max requests per second (1-20) |
| `--dry-run-only` | no | off | If set, the tool only sends `dryRun: true` requests (no mutations) |
| `--limit <n>` | no | none | Process only the first N matching rows |

## Output

Results are written to `~/Downloads/identity-backfill-batch-results/<stage>-<timestamp>/`:

| File | Content |
|------|---------|
| `processed.csv` | Rows that completed successfully (with the resolved IdentityId) |
| `rejected.csv` | Rows that failed pre-req checks (e.g. missing country, multi-CRM) |
| `errors.csv` | Technical errors after retries (5xx, timeouts, etc.) |
| `summary.txt` | Counts and duration |
| `state.json` | Resume marker — re-running with the same output dir skips already-done emails |

## Behaviour

For each row the tool:

1. Picks `sf_contact_email`, falling back to `zuora_bill_to_email`. Skips if both empty.
2. Calls `identity-backfill` with `dryRun: true`.
3. If the dry-run returns `400` the row is recorded in `rejected.csv` and skipped.
4. If the dry-run returns `200` and `--dry-run-only` is **not** set, the tool waits
   for the rate-limit delay then calls again with `dryRun: false` and records the
   outcome in `processed.csv` or `errors.csv`.
5. Transient `5xx`/network errors are retried up to 3 times with exponential backoff.

Idempotent against the lambda itself: an account that already has an `IdentityId__c`
will be rejected by the lambda's pre-req check, so re-running on a partially-done
dataset is safe.

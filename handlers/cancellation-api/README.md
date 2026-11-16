# cancellation-api

Cancels subscriptions and refunds the customer when a refund is due, in line with the DMCC Act cooling-off and refund rules.
It has two parts:

1. **Cancellation API**: an API Gateway Lambda that cancels a subscription on request.
2. **Refund workflow**: a Step Functions state machine, started by the cancellation API, that handles the parts that
   can take days: waiting for payment settlement, refunding, balancing invoices, and dealing with Direct Debits that fail to settle.

This replaces product-move-api's `RefundHandler` (SQS `product-switch-refund-{stage}`) and its use of invoicing-api `/refund`.
The refund rules are carried over unchanged. In practice only Supporter Plus is refund-eligible to begin with.

## Status

| Part | Status |
|---|---|
| Cancellation API | WIP in [#3946](https://github.com/guardian/support-service-lambdas/pull/3946): routing, validation, docs and local serving. Both endpoints return a fixed example; no Zuora calls, emails or events yet |
| Refund workflow | In progress: `calculateRefund` is a placeholder that validates its input and then fails. Other Lambdas and the state machine are still to come |

## Cancellation API

TODO: being built in [#3946](https://github.com/guardian/support-service-lambdas/pull/3946) (WIP). The OpenAPI spec is generated from the zod route schemas.

| Operation | Method and path | Request body |
|---|---|---|
| Preview | `POST /subscriptions/{subscriptionNumber}/preview-cancellation` | `{}` |
| Cancel | `POST /subscriptions/{subscriptionNumber}/cancel` | `{ "reason"?: string }` |
| Generated OpenAPI (public) | `GET /openapi.json` | |
| Interactive docs (public) | `GET /docs` | |

- **Auth:** operations need an API Gateway key and an `x-identity-id` header, supplied by manage-frontend.
- **Response:** either `{ "type": "hard", "willRefund": boolean }` or `{ "type": "soft", "accessEndDate": "YYYY-MM-DD" }`.
- **URLs:** CODE https://cancellation-api-code.support.guardianapis.com, PROD https://cancellation-api.support.guardianapis.com

For each cancellation request it:

1. Validates the request.
2. Decides refund eligibility.
3. Cancels the subscription via the Zuora Orders API:
   - when a refund is due, backdated to `LastPlanAddedDate__c`
   - otherwise, at the end of the current billing period
4. Sends the confirmation email and a `Cancellation` event to EventBridge.
5. Starts the refund workflow when a refund is due, **or** when the subscription is paid by Direct Debit and its latest
   positive invoice hasn't settled yet. It uses the same settlement rule as the workflow.

## Refund workflow

The workflow assumes the subscription is already cancelled. It never re-checks refund eligibility and never sends the
confirmation email or event.

1. If a refund is due: generate and post the cancellation (negative) invoice and calculate the refund.
2. Wait for the payment to settle, checking daily for up to 14 days. If it still hasn't settled, the execution fails
   and raises an alarm.
3. Once settled: refund the customer if a refund is due, then balance the invoices.
4. If a Direct Debit fails to settle:
   - when no refund is due, backdate the cancellation to the start of the unpaid period, so the customer doesn't get
     that period free
   - in all cases, balance the invoices and send `cancelled-payment-email`

Each Lambda checks Zuora for completion before acting, so any step can safely be re-run and no datastore is needed.
See the issue below for the state diagram and the detailed rules.

## Alarms

Alarms go to Lifecycle via alarms-handler.

| Alarm | Raised when | Status |
|---|---|---|
| Cancellation API errors | TODO | TODO |
| Refund workflow could not be started | `StartExecution` fails | TODO |
| Refund workflow failed | an execution fails, times out or is aborted: a customer not refunded, or a failed DD not acted on | TODO |

## Layout

```
src/
  index.ts                  TODO: cancellation API entry point ([#3946](https://github.com/guardian/support-service-lambdas/pull/3946))
  endpoints/                TODO: one file per API route, plus the shared request/response contract ([#3946](https://github.com/guardian/support-service-lambdas/pull/3946))
  refund/
    refundWorkflowInput.ts  zod schema for the workflow input, used by the cancellation API to start an execution
    handlers/*.ts           one entry point per workflow Lambda
test/
cdk: ../../cdk/lib/cancellation-api.ts
```

The workflow input must stay backward compatible: only add optional fields, because executions can still be running for
up to 14 days after a deploy.

## How to test

```bash
pnpm --filter cancellation-api test
pnpm --filter cdk test cancellation-api
```

TODO: run the API locally with `pnpm --filter cancellation-api local` and open http://localhost:8787/docs ([#3946](https://github.com/guardian/support-service-lambdas/pull/3946)).

TODO: integration tests and CODE end-to-end scenarios.

## References

- Refund workflow design and delivery plan: https://github.com/guardian/support-service-lambdas/issues/3942
- [Asana epic](https://app.asana.com/1/1210045093164357/project/1213134855566811/task/1220070924460390)
- [Design doc: DMCCA cancellation and refunds](https://docs.google.com/document/d/1HD8KhUndfSspOoB3vf5749eUqPZ4S-LkumFwM-CB-7Y/edit?tab=t.0)
- [DMCC cooling off and refund tables](https://docs.google.com/spreadsheets/d/16WsRtjNOTizvmmH_LKQDocn7K5AAim2j3N6hoMAnJp0/edit?gid=0#gid=0)
- [Zuora Orders API](https://developer.zuora.com/v1-api-reference/api/orders/)
- [Hono Zod OpenAPI](https://hono.dev/examples/zod-openapi)
- [AWS Step Functions developer guide](https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html)

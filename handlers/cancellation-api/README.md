# cancellation-api

Cancels subscriptions and refunds the customer when a refund is due. Our cooling-off and refund rules are based on the DMCC Act, but can be more generous.
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

TODO

## Refund workflow

The workflow assumes the subscription is already cancelled. It never re-checks refund eligibility and never sends the
confirmation email or event.

1. If a refund is due: post the cancellation (negative) invoice and calculate the refund, which is the total of the
   invoice being refunded (charges plus tax).
2. Find the latest payment on that invoice (or, if no refund is due, on the latest positive invoice).
3. If it's a pending Direct Debit, wait for it to settle, checking daily; after 14 days, fail and alarm.
4. If it succeeded: refund if due, then balance the invoices.
5. If a Direct Debit fails to settle, backdate the cancellation to the start of the unpaid period (never later), balance
   the invoices, and send `cancelled-payment-email` if it was backdated.

Every step is safe to re-run: each Lambda checks Zuora for its own completed work first. Zuora idempotency keys aren't
used because they expire after 24 hours and cache failures.
See the issue below for the detailed rules.

### Flow Diagram
```mermaid
%%{init: {"flowchart": {"nodeSpacing": 15, "rankSpacing": 20, "padding": 4}, "themeVariables": {"fontSize": "11px"}}}%%
flowchart TD
    start(["Start"]) --> due{"Refund due?"}
    due -->|"yes"| gen["GenerateAndPostInvoice"]
    gen --> calc["CalculateRefund"]
    calc --> zero{"Zero amount?"}
    zero -->|"yes"| balance["BalanceNegativeInvoice"]
    zero -->|"no"| check["CheckPaymentSettlement"]
    due -->|"no"| check
    check --> status{"Payment?"}
    status -->|"DD Pending"| days{"Under 14 days?"}
    days -->|"yes"| wait["Wait 24h"]
    wait --> check
    days -->|"no"| fail(["Fail and alarm"])
    status -->|"(Success AND NOT DD) OR (DD AND Settled)"| sdue{"Refund due?"}
    sdue -->|"yes"| refund["CreateRefund"]
    sdue -->|"no"| done(["Succeed"])
    refund --> adjust["AdjustPaidInvoice"]
    status -->|"FailedToSettle"| backdate["BackdateCancellation"]
    backdate --> regen["RegenerateInvoice"]
    regen --> recalc["CalculateCredit"]
    recalc --> adjust
    adjust --> balance
    balance --> failed{"Backdated?"}
    failed -->|"yes"| email["SendPaymentFailedEmail"]
    failed -->|"no"| done
    email --> done

    classDef task fill:#0d47a1,stroke:#002171,color:#ffffff,font-weight:bold
    classDef terminal fill:#1b5e20,stroke:#003300,color:#ffffff,font-weight:bold
    classDef failure fill:#b71c1c,stroke:#7f0000,color:#ffffff,font-weight:bold
    classDef decision fill:#e65100,stroke:#ac1900,color:#ffffff,font-weight:bold
    class gen,calc,check,refund,adjust,balance,wait,backdate,regen,recalc,email task
    class start,done terminal
    class fail failure
    class due,zero,status,days,sdue,failed decision
```

## Alarms

Alarms go to Lifecycle via alarms-handler.

| Alarm | Raised when | Status |
|---|---|---|
| Cancellation API errors | the API returns a 5xx, including when the refund workflow can't be started (`StartExecution` fails) | TODO |
| Refund workflow failed | an execution fails, times out or is aborted: a customer not refunded, or a failed DD not acted on | TODO |


## References

- Refund workflow design and delivery plan: https://github.com/guardian/support-service-lambdas/issues/3942
- [Asana epic](https://app.asana.com/1/1210045093164357/project/1213134855566811/task/1220070924460390)
- [Design doc: DMCCA cancellation and refunds](https://docs.google.com/document/d/1HD8KhUndfSspOoB3vf5749eUqPZ4S-LkumFwM-CB-7Y/edit?tab=t.0)
- [DMCC cooling off and refund tables](https://docs.google.com/spreadsheets/d/16WsRtjNOTizvmmH_LKQDocn7K5AAim2j3N6hoMAnJp0/edit?gid=0#gid=0)
- [Zuora Orders API](https://developer.zuora.com/v1-api-reference/api/orders/)
- [Hono Zod OpenAPI](https://hono.dev/examples/zod-openapi)
- [AWS Step Functions developer guide](https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html)

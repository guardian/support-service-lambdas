## Cancellations Bus

This [CDK-only handler](../../cdk/lib/cancellations-bus.ts) creates an EventBridge event
bus (`cancellations-bus-CODE` /
`cancellations-bus-PROD`) for cancellation events, used across multiple producers and
listeners.

It exists so that multiple producers (e.g. Zuora auto cancel, Supporter Plus cancel, MDAPI,
Salesforce cancellation) and multiple listeners (e.g. a lambda that sends secondary account
cancellation emails) can be added independently over time, without coupling them directly
to each other.

Future use cases could include a new fact_acquisition_event style bigquery table
and decoupling of existing non critical logic (e.g. confirmation emails, writes to SF/
supporter-product-data)

This stack only creates the bus itself and a catch-all rule that logs every event to
CloudWatch Logs, to aid debugging. Producers and listeners are implemented and deployed
separately, and are granted access via `AllowPutSubscriptionEventPolicy`
(see [cdk/lib/cdk/policies.ts](../../cdk/lib/cdk/policies.ts)) or by subscribing to the bus.

### Further information

See the SPIKE: [Sending secondary account cancellation emails Sep 2026](https://docs.google.com/document/d/1soYr7Ok0ew041hm4V4C-o7i2roRPo4IvFU5u0myDtpI/edit?usp=sharing)
for the design decision (option E1+M3) behind this bus.

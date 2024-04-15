A module to enable sending of emails from Typescript code via Braze and [membership-workflow](https://github.com/guardian/membership-workflow/) 

Lambdas which use this functionality will need appropriate IAM permissions. For an example of this see the `new-product-api` (reproduced below):

```typescript
    const sqsInlinePolicy: Policy = new Policy(this, "sqs-inline-policy", {
    statements: [
        new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                "sqs:GetQueueUrl",
                "sqs:SendMessage"
            ],
            resources: [
                `arn:aws:sqs:${this.region}:${this.account}:braze-emails-${this.stage}`
            ]
        }),
    ],
})
addSubscriptionLambda.role?.attachInlinePolicy(sqsInlinePolicy);
```
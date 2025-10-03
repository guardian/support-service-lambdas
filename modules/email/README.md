A module to enable sending of emails from Typescript code via Braze and [membership-workflow](https://github.com/guardian/membership-workflow/) 

Lambdas which use this functionality will need appropriate IAM permissions. Add the policy below to your CDK (or see [`update-supporter-plus-amount`](https://github.com/guardian/support-service-lambdas/blob/ff152cfed9ac3a91267b1a9adcc6be09378a3126/cdk/lib/update-supporter-plus-amount.ts#L134) )

```typescript
    const sqsInlinePolicy: Policy = new AllowSqsSendPolicy(this, 'braze-emails');
    addSubscriptionLambda.role!.attachInlinePolicy(sqsInlinePolicy);
```

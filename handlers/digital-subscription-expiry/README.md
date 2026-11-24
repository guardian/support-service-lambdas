# digital subscription expiry lambdas

## HOWTO generate an emergency token (CAS code) for customer service teams
1. get janus credentials
2. edit src/test/scala/GenerateEmergencyToken.scala for the reqired expiry
3. run it and your token should be displayed in the console


Lambda to determine if a the user has an active subscription that allows them to download the digital edition.

Sample request: 
```
POST /subs HTTP/1.1
Host: localhost:9300
Content-Type: application/json
Cache-Control: no-cache

{
    "appId": <appId>,
    "deviceId": <deviceId>,
    "subscriberId": <Id from Zuora. From Zuora dev if running locally>,
    "password": <password>
}

```
Sample response:
```
{
  "expiry": {
    "expiryType": "sub",
    "expiryDate": "2018-04-19",
    "content": "SevenDay"
  }
}
```

The cloudformation in this project defines a public API Gateway exposing the lambda as `POST /subs` on `digital-subscription-authorisation-<stage>.subscriptions.guardianapis.com`.

The endpoint is unauthenticated at the gateway (callers authenticate with their subscriber id and postcode or surname), so it is protected by a WAF. The Web ACL is defined in [guardian/waf](https://github.com/guardian/waf) (`lib/membership/digital-subscription-expiry-waf.ts`), which rate limits each IP to slow guessing of subscriber ids, passwords and emergency tokens. This project publishes the API stage ARN to the SSM parameter `/infosec/waf/services/<stage>/digital-subscription-expiry-api-gateway-arn` for that stack to use.

References:
- [guardian/waf README](https://github.com/guardian/waf#readme)
- [AWS WAF rate-based rules](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based.html)
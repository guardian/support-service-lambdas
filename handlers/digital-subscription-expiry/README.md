# digital subscription expiry lambdas

## HOWTO generate an emergency token
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

The cloudformation in this project doesn't define an api gateway, instead the lambda is just exported to be included in the '/subs' endpoint of the [digital subscription authorisation](https://github.com/guardian/digital-subscription-authorisation/blob/main/cloudformation.yaml) api gateway
# batch-email-sender

This lambda is responsible for handling the following _service_ emails (non-marketing) via [Braze API Triggered Campaigns](https://www.braze.com/docs/user_guide/engagement_tools/campaigns/scheduling_and_organizing/scheduling_your_campaign/#api-triggered-campaigns-server-triggered-campaigns):

| Service email                  | Salesforce `object_name`     | Salesforce `email_stage`  | Braze Campaign Name           |
| ------------------------------ | ---------------------------- | ------------------------- | ----------------------------- |
| Credit Card Expiry             | `Card_Expiry__c`             |                           | CC Expiry                     |
| Direct Debit Mandate failure 1 | `DD_Mandate_Failure__c`      | `MF1`                     | Direct Debit - Email 1        |
| Direct Debit Mandate failure 2 | `DD_Mandate_Failure__c`      | `MF2`                     | Direct Debit - Email 2        |
| Direct Debit Mandate failure 3 | `DD_Mandate_Failure__c`      | `MF3`                     | Direct Debit - Email 3        |
| Direct Debit Mandate failure 4 | `DD_Mandate_Failure__c`      | `MF4`                     | Direct Debit - Email 4        |
| Direct Debit Mandate failure 5 | `DD_Mandate_Failure__c`      | `MF5`                     | Direct Debit - Email 5        |
| Direct Debit Mandate failure 6 | `DD_Mandate_Failure__c`      | `MF6`                     | Direct Debit - Email 6        |
| Holiday-stop confirmation      | `Holiday_Stop_Request__c`    | `create`                  | SV_HolidayStopConfirmation    |

## How it works?

1. Salesforce POST JSON batch emails
1. `batch-email-sender` handles Salesforce POST
1. `batch-email-sender` puts messages on the `contributions-thanks` SQS queue
1. [`membership-workflow`](https://github.com/guardian/membership-workflow) processes the queue
1. `membership-workflow` either [hits Braze](https://www.braze.com/docs/developer_guide/rest_api/messaging/#sending-messages-via-api-triggered-delivery) directly or delegates to Identity `payment-failure` to embed magic link
1. `membership-workflow` publishes SNS message to `identity-payment-failure-PROD` topic
1. [`payment-failure`](https://github.com/guardian/identity-processes/tree/master/payment-failure) embeds magic link and hists Braze
1. [Braze](https://dashboard-01.braze.eu) schedules a campaign message send via [API Triggered Delivery](https://www.braze.com/docs/developer_guide/rest_api/messaging/#sending-messages-via-api-triggered-delivery)

![sequence_diagram](https://user-images.githubusercontent.com/13835317/51552742-2a349800-1e69-11e9-8df4-55eec10b649d.png)

Braze [`Campaign API Identifiers`](https://www.braze.com/docs/developer_guide/rest_api/messaging/#campaign-identifier) are stored in `membership-workflow.private.conf` under `braze.campaigns` 

## How to add new email?

1. Update SF trigger to post new `object_name` and `email_stage` 
1. Update `EmailToSend.brazeCampaignId` match statement to handle the new case
1. Add new email to `membership-workflow` [EmailName.EmailNamesByName](https://github.com/guardian/membership-workflow/blob/2e354b81888f6d222d9de0b4c2eda8e0f2b14729/app/model/EmailName.scala#L99)
1. Add new Braze Template API Identifiers to `membership-workflow.private.conf` under `braze.campaigns`

## How to embed magic link in an email?

If you wish to add Identity magic link, then add Campaign ID to [IdentityProxyBrazeClient.defaultProxiedEmailNames](https://github.com/guardian/membership-workflow/blob/2e354b81888f6d222d9de0b4c2eda8e0f2b14729/app/services/IdentityProxyBrazeClient.scala#L51).
In this case `membership-workflow` will delegate Braze request to Identity [`payment-failure`](https://github.com/guardian/identity-processes/tree/master/payment-failure) lambda.

## How to add personalisation fields to email templates?

[Using the Templated Content Included With an API request](https://www.braze.com/docs/user_guide/engagement_tools/campaigns/scheduling_and_organizing/scheduling_your_campaign/#using-the-templated-content-included-with-an-api-request) 

`trigger_properties` fields in body of `POST campaigns/trigger/send` can be referenced in email template `{{ api_trigger_properties.${ my_field }}}`

**Example:**

`Braze dashboard | Engagement | Campaigns | Direct Debit - Email 1 | Edit Campaign | Edit Email Body`:

```
Hi {{api_trigger_properties.${first_name}}} {{api_trigger_properties.${last_name}}},<br>
```

## Example request 

`POST {url}/{CODE or PROD}/email-batch`

headers:
```$xslt
Content-Type: application-json
x-api-key: {the api key}
```
body:
```json
{
    "batch_items": [  
       {  
          "payload":{
             "record_id": "12345",  
             "to_address":"dlasdj@dasd.com",
             "subscriber_id":"A-S00044748",
             "sf_contact_id":"0036E00000KtDaHQAV",
             "product":"Membership",
             "next_charge_date":"2018-09-03",
             "last_name":"bla",
             "identity_id":"30002177",
             "first_name":"something",
             "email_stage":"MBv1 - 1"
          },
          "object_name":"Card_Expiry__c"
       },
       {  
          "payload":{
             "record_id": "2222222",  
             "to_address":"dlasdj@dasd.com",
             "subscriber_id":"A-S00044748",
             "sf_contact_id":"0036E00000KtDaHQAV",
             "product":"Membership",
             "next_charge_date":"2018-09-03",
             "last_name":"bla",
             "identity_id":"30002177",
             "first_name":"something",
             "email_stage":"MBv1 - 1"
          },
          "object_name":"Card_Expiry__c"
       }
    ]
}
```

### Responses
| Scenario      | Response code  | Sample response body | Retry ok? 
| ------------- |-------------  | ---------------| ------|
| All items added to queue     | 200 | None | No |
| Request not parsed      | 400      | None | Yes |
| API key not provided/isn't correct    | 403     | `{"message": "Forbidden"}` | Yes |
| Failures in adding to the queue | 502 | see below | Yes, for ids in the list. |
| Unexpected error. Need to investigate and check the logs of the lambda/api gateway/queue | 500 | `{ "message": "Internal server error"}` | No. The batch may have been partially added to the queue.


If there are failures in adding the the queue, the api will respond with a list of ids that can be retried in this format
```$xslt
{
    "message": "There were items that were not added to the queue.",
    "failed_item_ids": ["0036E00000KtDaABCD", "0036E00000KtDaEFGH", "0036E00000KtDaIJKL"]
}
```

## How to test?

### Salesforce message 

```http request
POST /CODE/email-batch HTTP/1.1
Host: yoidgarsd5.execute-api.eu-west-1.amazonaws.com
Content-Type: application/json
x-api-key: ******************** 
cache-control: no-cache
{
    "batch_items": [
        {
            "payload": {
            	"record_id": "12345",
                "to_address": "foo@example.com",
                "subscriber_id": "A-S00048871",
                "sf_contact_id": "0036E00000KtDaHQAV",
                "product": "Guardian Weekly - Domestic",
                "next_charge_date": "2018-09-03",
                "last_name": "bla",
                "identity_id": "100002283",
                "first_name": "something",
                "email_stage": "MF6"
            },
            "object_name": "DD_Mandate_Failure__c"
        }
    ]
}
```
### SQS message to `contributions-thanks` queue

| Stage         | SQS queue name           |
| ------------- | ------------------------ |
| CODE          | contributions-thanks-dev |
| PROD          | contributions-thanks     |

```json
{
  "To" : {
    "Address" : "example@gu.com",
    "SubscriberKey" : "example@gu.com",
    "ContactAttributes" : {
      "SubscriberAttributes" : {
        "first_name" : "foo",
        "next_charge_date" : "3 September 2018",
        "subscriber_id" : "A-S00044748",
        "last_name" : "bar",
        "product" : "Membership"
      }
    }
  },
  "DataExtensionName" : "expired-card",
  "SfContactId" : "0036E00000KtDaHQAV",
  "IdentityUserId" : "30002177"
}
```

### Braze message

```http request
POST /campaigns/trigger/send HTTP/1.1
Host: rest.fra-01.braze.eu
Content-Type: application/json
cache-control: no-cache
{
    "api_key": "****************",
    "campaign_id": "5bc1e0c9-c119-4540-9604-ffea46967257",
    "recipients": [
        {
            "external_user_id": "100001617",
            "trigger_properties": {
                "first_name": "John",
                "last_name": "Doe",
                "product": "Guardian Weekly - Domestic",
                "emailToken": "abcde123.asdfklsdf"
            }
        }
    ]
}
```


### Logs
`batch-email-sender`:
```bash
awslogs get --profile membership /aws/lambda/batch-email-sender-CODE ALL --watch
```

`membership-workflow`:
```bash
awslogs get --profile membership membership-workflow-CODE ALL --watch
```

`payment-failure`:
```bash
awslogs get --profile identity /aws/lambda/PaymentFailureLambda-CODE ALL --watch
```

# batch-email-sender

Transforms Salesforce message to Braze SQS message for pickup by membership-workflow, for example, it transforms

```
{
	"batch_items": [{
		"payload": {
			"to_address": "bvtgedltoa@guardian.co.uk",
			"subscriber_id": "",
			"sf_contact_id": "0033E00001Chmk9QAB",
			"record_id": "0033E00001Chmk9QAB",
			"product": "",
			"next_charge_date": null,
			"modified_by_customer": null,
			"last_name": "bvtgedltoa",
			"identity_id": "200002073",
			"holiday_stop_request": null,
			"first_name": "bvtgedltoa",
			"email_stage": "Delivery address change",
			"digital_voucher": null,
			"delivery_problem": null,
			"delivery_address_change": {
				"mailingStreet": "address line 1,address line 2",
				"mailingState": "state",
				"mailingPostalCode": "postcode",
				"mailingCountry": "Afghanistan",
				"mailingCity": "town",
				"addressChangeEffectiveDateBlurb": "Guardian weekly subscription (A-S00060454)  as of front cover dated Friday 10th April 2020\n\n(as displayed on confirmation page at 18:21:07  on 27th March 2020)"
			}
		},
		"object_name": "Contact"
	}]
}
```

to

```
{
  "To" : {
    "Address" : "bvtgedltoa@guardian.co.uk",
    "SubscriberKey" : "bvtgedltoa@guardian.co.uk",
    "ContactAttributes" : {
      "SubscriberAttributes" : {
        "first_name" : "bvtgedltoa",
        "last_name" : "bvtgedltoa",
        "subscriber_id" : "",
        "product" : "",
        "delivery_address_change_line1" : "address line 1",
        "delivery_address_change_line2" : "address line 2",
        "delivery_address_change_city" : "town",
        "delivery_address_change_state" : "state",
        "delivery_address_change_postcode" : "postcode",
        "delivery_address_change_country" : "Afghanistan",
        "delivery_address_change_effective_date_blurb" : "Guardian weekly subscription (A-S00060454)  as of front cover dated Friday 10th April 2020\n\n(as displayed on confirmation page at 18:21:07  on 27th March 2020)"
      }
    }
  },
  "DataExtensionName" : "SV_DeliveryAddressChangeConfirmation",
  "SfContactId" : "0033E00001Chmk9QAB",
  "IdentityUserId" : "200002073",
  "recordId" : "0033E00001Chmk9QAB"
}
```

## How to add new email?

Remember to setup Braze [Campaign Alerts](https://www.braze.com/docs/user_guide/engagement_tools/campaigns/scheduling_and_organizing/campaign_alerts/) to monitor emails, by sending alert to SX address, for example, 

```
Send an alert via email if during the course of 1 day, the messages sent fall below 1.
```

Example PR: [Add SV_DeliveryAddressChangeConfirmation email #196](https://github.com/guardian/salesforce/pull/196)

Code changes are necessary in at least

1. **Salesforce**
    - trigger on an object, for example, `ContacTrigger.trigger`
    - trigger handler, for example, `DeliveryAddressChangeEmail.cls`
    - json payload model - `CommsDetailsToServiceLayer.cls`
    - unit test to satisfy Salesforce enforced coverage, for example, `DeliveryAddressChangeEmailTest.cls`

2. **batch-email-sender scala lambda**
    - Raw Salesforce model, `WireEmailBatchItemPayload` in `EmailBatch.scala`
    - Intermediary model, `EmailBatchItem` in `EmailBatch.scala`
    - Actual Braze SQS message model, `EmailPayloadSubscriberAttributes` in `EmailToSend.scala`

3. **Braze Liquid templating language**
    - Liquid changes in either template directly or the content block `Templated & Media | Content Blocks Library`
    - For example, `SV_DeliveryProblemConfirmation_BodyCopy`
    - Template syntax https://shopify.dev/docs/liquid

4. **membership-workflow**
    - add braze campaign IDs to `CODE.conf` and `PROD.conf`

Tips for quicker dev feedback loop:
 - Due to multiple moving parts, when something goes wrong, it is helpful to enable realtime [log tailing](https://github.com/guardian/salesforce#tailing-logs) on each system
 - In SF CODE, `CommsDetailsToServiceLayer.cls` currently cannot be saved. Workaround is to use `VSC | Right click on the file | SFDX: Deploy this source to Org` or the corresponding sfdx CLI command.
 - First figure out a quick way to trigger emails from salesforce, for example, by making sure [CODE MMA](https://manage.code.dev-theguardian.com/delivery/guardianweekly/address/confirmed) actually affects SF CODE. If test-user is NOT used then CODE MMA should talk to SF CODE.
 - Deploy changes to batch-email-sender CODE directly from CLI:
     ```
     sbt batch-email-sender/assembly
     aws lambda update-function-code --function-name batch-email-sender-CODE --zip-file fileb://support-service-lambdas/handlers/batch-email-sender/target/scala-2.12/batch-email-sender.jar --profile membership
     ```
     
## How it works?

1. Salesforce POST JSON batch emails
1. `batch-email-sender` handles Salesforce POST
1. `batch-email-sender` puts messages on the `braze-emails-$stage` SQS queue
1. [`membership-workflow`](https://github.com/guardian/membership-workflow) processes the queue
1. `membership-workflow` either [hits Braze](https://www.braze.com/docs/developer_guide/rest_api/messaging/#sending-messages-via-api-triggered-delivery) directly or delegates to Identity `payment-failure` to embed magic link
1. `membership-workflow` publishes SNS message to `identity-payment-failure-PROD` topic
1. [`payment-failure`](https://github.com/guardian/identity-processes/tree/main/payment-failure) embeds magic link and hits Braze
1. [Braze](https://dashboard-01.braze.eu) schedules a campaign message send via [API Triggered Delivery](https://www.braze.com/docs/developer_guide/rest_api/messaging/#sending-messages-via-api-triggered-delivery)

![sequence_diagram](https://user-images.githubusercontent.com/13835317/51552742-2a349800-1e69-11e9-8df4-55eec10b649d.png)

Braze [`Campaign API Identifiers`](https://www.braze.com/docs/developer_guide/rest_api/messaging/#campaign-identifier) are stored in `membership-workflow.private.conf` under `braze.campaigns` 

## How to embed magic link in an email?

If you wish to add Identity magic link, then add Campaign ID to [IdentityProxyBrazeClient.defaultProxiedEmailNames](https://github.com/guardian/membership-workflow/blob/2e354b81888f6d222d9de0b4c2eda8e0f2b14729/app/services/IdentityProxyBrazeClient.scala#L51).
In this case `membership-workflow` will delegate Braze request to Identity [`payment-failure`](https://github.com/guardian/identity-processes/tree/main/payment-failure) lambda.

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
### SQS message to `braze-emails-$stage` queue

| Stage         | SQS queue name   |
| ------------- |------------------|
| CODE          | braze-emails-CODE |
| PROD          | braze-emails-PROD |

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

# batch-email-sender
There is work done in Salesforce that, on a schedule, generates information about emails that need to be sent. 

This lambda receives a call from Salesforce with a batch of emails to be sent and adds items to the 
contributions-thanks queue so that the email will be sent 

![sequence_diagram](https://user-images.githubusercontent.com/13835317/51552742-2a349800-1e69-11e9-8df4-55eec10b649d.png)

Braze `Template API Identifiers` are stored in `membership-workflow.private.conf` under `braze.campaigns` 

## How to add new email?

1. Update SF trigger to post new `object_name` and `email_stage` 
1. Update `EmailToSend.brazeCampaignId` match statement to handle the new case
1. Add new email to `membership-workflow` [EmailName.EmailNamesByName](https://github.com/guardian/membership-workflow/blob/2e354b81888f6d222d9de0b4c2eda8e0f2b14729/app/model/EmailName.scala#L99)
1. Add new Braze Template API Identifiers to `membership-workflow.private.conf` under `braze.campaigns`
1. If you wish to add Identity magic link, then add email to [IdentityProxyBrazeClient.defaultProxiedEmailNames](https://github.com/guardian/membership-workflow/blob/2e354b81888f6d222d9de0b4c2eda8e0f2b14729/app/services/IdentityProxyBrazeClient.scala#L51)


## Sample request 

`POST {url}/{CODE or PROD}/email-batch`

headers:
```$xslt
Content-Type: application-json
x-api-key: {the api key}
```
body:
```
{
    "batch_items": [  
       {  
          "payload":{  
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
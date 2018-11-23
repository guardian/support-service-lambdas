# batch-email-sender
There is work done in Salesforce that, on a schedule, generates information about emails that need to be sent. 

This lambda receives a call from Salesforce with a batch of emails to be sent and adds items to the 
contributions-thanks queue so that the email will be sent 



### Sample request 

`POST {url}/{CODE or PROD}/email-batch`

body:
```[  
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
```

### Responses
| Scenario      | Response code  | Response body | Retry ok? 
| ------------- |-------------  | ---------------| ------|
| All items added to queue     | 200 | None | No |
| Request not parsed      | 400      | None | Yes |
| No items added to queue (TBD!) | 502 | `{"message": "No ids added.}` | Yes |
| Some emails added to queue (TBD!) | 502 | `{"message": "Some ids failed." failed_items: ["id1", "id2"]}` | Yes, for ids in the list. |


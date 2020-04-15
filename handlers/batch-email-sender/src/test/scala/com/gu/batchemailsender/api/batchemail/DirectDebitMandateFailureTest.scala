package com.gu.batchemailsender.api.batchemail

import com.gu.batchemailsender.api.batchemail.SalesforceMessage.SalesforceBatchItems
import org.scalactic.TripleEquals
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.Json

class DirectDebitMandateFailureTest extends AnyFlatSpec with Matchers with TripleEquals {
  val rawSalesforceMessage =
    """
      |{
      |    "batch_items": [
      |        {
      |            "payload": {
      |                "to_address": "KXb@ejv.me",
      |                "subscriber_id": "A-S00iF8XSw",
      |                "sf_contact_id": "8NJo4HN",
      |                "record_id": "xR9",
      |                "product": "Contributor",
      |                "next_charge_date": "2020-04-11",
      |                "modified_by_customer": null,
      |                "last_name": "asfdadf",
      |                "identity_id": "89782",
      |                "holiday_stop_request": null,
      |                "first_name": "7KCB7Hf",
      |                "email_stage": "MF1",
      |                "digital_voucher": null
      |            },
      |            "object_name": "DD_Mandate_Failure__c"
      |        }
      |    ]
      |}
      |""".stripMargin

  val expectedRawBrazeSqsMessage =
    """{
      |  "To" : {
      |    "Address" : "KXb@ejv.me",
      |    "SubscriberKey" : "KXb@ejv.me",
      |    "ContactAttributes" : {
      |      "SubscriberAttributes" : {
      |        "first_name" : "7KCB7Hf",
      |        "last_name" : "asfdadf",
      |        "subscriber_id" : "A-S00iF8XSw",
      |        "next_charge_date" : "11 April 2020",
      |        "product" : "Contributor"
      |      }
      |    }
      |  },
      |  "DataExtensionName" : "dd-mandate-failure-1",
      |  "SfContactId" : "8NJo4HN",
      |  "IdentityUserId" : "89782",
      |  "recordId" : "xR9"
      |}""".stripMargin

  "Direct debit mandate failure Salesforce message" should "transform to Braze SQS message for membership-workflow pickup" in {
    val sfMsg = Json.parse(rawSalesforceMessage).as[SalesforceBatchItems].batch_items.head
    val brazeMsg = BrazeSqsMessage.fromSalesforceMessage(sfMsg)
    val actualRawBrazeSqsMessage = Json.prettyPrint(Json.toJson(brazeMsg))
    actualRawBrazeSqsMessage should ===(expectedRawBrazeSqsMessage)
  }
}

package com.gu.batchemailsender.api.batchemail

import com.gu.batchemailsender.api.batchemail.SalesforceMessage.SalesforceBatchItems
import org.scalactic.TripleEquals
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.Json

class HolidayStopConfirmationTest extends AnyFlatSpec with Matchers with TripleEquals {
  val rawSalesforceMessage =
    """
      |{
      |    "batch_items": [
      |        {
      |            "payload": {
      |                "to_address": "harradence@hotmail.com",
      |                "subscriber_id": "A-S00911111",
      |                "sf_contact_id": "0030J00001111111",
      |                "record_id": "xR9",
      |                "product": "Newspaper - Voucher Book",
      |                "next_charge_date": "2020-04-06",
      |                "modified_by_customer": false,
      |                "last_name": "aaaaaaaaa",
      |                "identity_id": "100011111",
      |                "holiday_stop_request": {
      |                    "stopped_issue_count": "5",
      |                    "stopped_credit_summaries": [
      |                        {
      |                            "credit_date": "2020-04-06",
      |                            "credit_amount": 6.58
      |                        }
      |                    ],
      |                    "stopped_credit_sum": "6.58",
      |                    "holiday_start_date": "2020-03-17",
      |                    "holiday_end_date": "2020-03-21",
      |                    "currency_symbol": "&pound;"
      |                },
      |                "first_name": "aaaaaaaaa",
      |                "email_stage": "create",
      |                "digital_voucher": null
      |            },
      |            "object_name": "Holiday_Stop_Request__c"
      |        }
      |    ]
      |}
      |""".stripMargin

  val expectedRawBrazeSqsMessage =
    """{
      |  "To" : {
      |    "Address" : "harradence@hotmail.com",
      |    "SubscriberKey" : "harradence@hotmail.com",
      |    "ContactAttributes" : {
      |      "SubscriberAttributes" : {
      |        "first_name" : "aaaaaaaaa",
      |        "last_name" : "aaaaaaaaa",
      |        "subscriber_id" : "A-S00911111",
      |        "next_charge_date" : "6 April 2020",
      |        "product" : "Newspaper - Voucher Book",
      |        "modified_by_customer" : false,
      |        "holiday_start_date" : "17 March 2020",
      |        "holiday_end_date" : "21 March 2020",
      |        "stopped_credit_sum" : "6.58",
      |        "currency_symbol" : "&pound;",
      |        "stopped_issue_count" : "5",
      |        "stopped_credit_summaries" : [ {
      |          "credit_amount" : 6.58,
      |          "credit_date" : "6 April 2020"
      |        } ]
      |      }
      |    }
      |  },
      |  "DataExtensionName" : "SV_HolidayStopConfirmation",
      |  "SfContactId" : "0030J00001111111",
      |  "IdentityUserId" : "100011111",
      |  "recordId" : "xR9"
      |}""".stripMargin

  "Holiday stop confirmation Salesforce message" should "transform to Braze SQS message for membership-workflow pickup" in {
    val sfMsg = Json.parse(rawSalesforceMessage).as[SalesforceBatchItems].batch_items.head
    val brazeMsg = BrazeSqsMessage.fromSalesforceMessage(sfMsg)
    val actualRawBrazeSqsMessage = Json.prettyPrint(Json.toJson(brazeMsg))
    actualRawBrazeSqsMessage should ===(expectedRawBrazeSqsMessage)
  }
}

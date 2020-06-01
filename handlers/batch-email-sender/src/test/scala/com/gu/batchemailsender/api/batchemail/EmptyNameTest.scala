package com.gu.batchemailsender.api.batchemail

import com.gu.batchemailsender.api.batchemail.SalesforceMessage.SalesforceBatchItems
import org.scalactic.TripleEquals
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.Json

class EmptyNameTest extends AnyFlatSpec with Matchers with TripleEquals {
  val rawSalesforceMessage =
    """
      |{
      |    "batch_items": [
      |        {
      |            "payload": {
      |                "to_address": "foo794@gu.com",
      |                "subscriber_id": "A-S00111111",
      |                "sf_contact_id": "0030J0000AAAAAAAA",
      |                "record_id": "a2D5I000000BBBBBB",
      |                "product": "Contributor",
      |                "next_charge_date": "2020-04-06",
      |                "modified_by_customer": null,
      |                "last_name": "     .     ",
      |                "identity_id": "100000001",
      |                "holiday_stop_request": null,
      |                "email_stage": "MBv1 - 1",
      |                "digital_voucher": null
      |            },
      |            "object_name": "Card_Expiry__c"
      |        }
      |    ]
      |}
      |""".stripMargin

  val expectedRawBrazeSqsMessage =
    """{
      |  "To" : {
      |    "Address" : "foo794@gu.com",
      |    "SubscriberKey" : "foo794@gu.com",
      |    "ContactAttributes" : {
      |      "SubscriberAttributes" : {
      |        "first_name" : "Supporter",
      |        "last_name" : "",
      |        "subscriber_id" : "A-S00111111",
      |        "next_charge_date" : "6 April 2020",
      |        "product" : "Contributor"
      |      }
      |    }
      |  },
      |  "DataExtensionName" : "expired-card",
      |  "SfContactId" : "0030J0000AAAAAAAA",
      |  "IdentityUserId" : "100000001",
      |  "recordId" : "a2D5I000000BBBBBB"
      |}""".stripMargin

  "Missing first/last names" should "be replaced with at least something like 'Dear Supporter" in {
    val sfMsg = Json.parse(rawSalesforceMessage).as[SalesforceBatchItems].batch_items.head
    val brazeMsg = BrazeSqsMessage.fromSalesforceMessage(sfMsg)
    val actualRawBrazeSqsMessage = Json.prettyPrint(Json.toJson(brazeMsg))
    actualRawBrazeSqsMessage should ===(expectedRawBrazeSqsMessage)
  }

}

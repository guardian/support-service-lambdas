package com.gu.batchemailsender.api.batchemail

import com.gu.batchemailsender.api.batchemail.SalesforceMessage.SalesforceBatchItems
import org.scalactic.TripleEquals
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.Json

class DigitalVoucherNewCardTest extends AnyFlatSpec with Matchers with TripleEquals {
  val rawSalesforceMessage =
    """
      |{
      |    "batch_items": [
      |        {
      |            "payload": {
      |                "to_address": "elrg5ohbzoaiulnikmc@gu.com",
      |                "subscriber_id": "A-S00082256",
      |                "sf_contact_id": "0033E00001CjpYRQAZ",
      |                "record_id": "xR9",
      |                "product": "Newspaper - Voucher Book",
      |                "next_charge_date": "2020-04-06",
      |                "modified_by_customer": null,
      |                "last_name": "elrg5OHBZOAiuLNIkmc",
      |                "identity_id": "102372126",
      |                "holiday_stop_request": null,
      |                "first_name": "elrg5OHBZOAiuLNIkmc",
      |                "email_stage": "create",
      |                "digital_voucher": {
      |                    "barcode_url": "https://digitalvouchers-uat-voucher.azurewebsites.net/voucher/a2F3E000001GpVQUA0/GSUB"
      |                }
      |            },
      |            "object_name": "Digital_Voucher__c"
      |        }
      |    ]
      |}
      |""".stripMargin

  val expectedRawBrazeSqsMessage =
    """{
      |  "To" : {
      |    "Address" : "elrg5ohbzoaiulnikmc@gu.com",
      |    "SubscriberKey" : "elrg5ohbzoaiulnikmc@gu.com",
      |    "ContactAttributes" : {
      |      "SubscriberAttributes" : {
      |        "first_name" : "elrg5OHBZOAiuLNIkmc",
      |        "last_name" : "elrg5OHBZOAiuLNIkmc",
      |        "subscriber_id" : "A-S00082256",
      |        "next_charge_date" : "6 April 2020",
      |        "product" : "Newspaper - Voucher Book",
      |        "digital_voucher" : {
      |          "barcode_url" : "https://digitalvouchers-uat-voucher.azurewebsites.net/voucher/a2F3E000001GpVQUA0/GSUB"
      |        }
      |      }
      |    }
      |  },
      |  "DataExtensionName" : "SV_SC_BarcodeAccess_Day0_plus_15",
      |  "SfContactId" : "0033E00001CjpYRQAZ",
      |  "IdentityUserId" : "102372126",
      |  "recordId" : "xR9"
      |}""".stripMargin

  "Digital voucher new card Salesforce message" should "transform to Braze SQS message for membership-workflow pickup" in {
    val sfMsg = Json.parse(rawSalesforceMessage).as[SalesforceBatchItems].batch_items.head
    val brazeMsg = BrazeSqsMessage.fromSalesforceMessage(sfMsg)
    val actualRawBrazeSqsMessage = Json.prettyPrint(Json.toJson(brazeMsg))
    actualRawBrazeSqsMessage should ===(expectedRawBrazeSqsMessage)
  }
}
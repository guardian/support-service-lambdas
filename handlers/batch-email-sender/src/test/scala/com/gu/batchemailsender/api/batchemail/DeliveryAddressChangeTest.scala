package com.gu.batchemailsender.api.batchemail

import com.gu.batchemailsender.api.batchemail.SalesforceMessage.SalesforceBatchItems
import org.scalactic.TripleEquals
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.Json

class DeliveryAddressChangeTest extends AnyFlatSpec with Matchers with TripleEquals {
  val rawSalesforceMessage =
    """
      |{
      |	"batch_items": [{
      |		"payload": {
      |			"to_address": "bvtgedltoa@guardian.co.uk",
      |			"subscriber_id": "",
      |			"sf_contact_id": "0033E00001Chmk9QAB",
      |			"record_id": "0033E00001Chmk9QAB",
      |			"product": "",
      |			"next_charge_date": null,
      |			"modified_by_customer": null,
      |			"last_name": "bvtgedltoa",
      |			"identity_id": "200002073",
      |			"holiday_stop_request": null,
      |			"first_name": "bvtgedltoa",
      |			"email_stage": "Delivery address change",
      |			"digital_voucher": null,
      |			"delivery_problem": null,
      |			"delivery_address_change": {
      |				"mailingStreet": "address line 1,address line 2",
      |				"mailingState": "state",
      |				"mailingPostalCode": "postcode",
      |				"mailingCountry": "Afghanistan",
      |				"mailingCity": "town",
      |				"addressChangeEffectiveDateBlurb": "Guardian weekly subscription (A-S00060454)  as of front cover dated Friday 10th April 2020\n\n(as displayed on confirmation page at 18:21:07  on 27th March 2020)"
      |			}
      |		},
      |		"object_name": "Contact"
      |	}]
      |}
      |""".stripMargin

  val expectedRawBrazeSqsMessage =
    """{
      |  "To" : {
      |    "Address" : "bvtgedltoa@guardian.co.uk",
      |    "SubscriberKey" : "bvtgedltoa@guardian.co.uk",
      |    "ContactAttributes" : {
      |      "SubscriberAttributes" : {
      |        "first_name" : "bvtgedltoa",
      |        "last_name" : "bvtgedltoa",
      |        "subscriber_id" : "",
      |        "product" : "",
      |        "delivery_address_change_line1" : "address line 1",
      |        "delivery_address_change_line2" : "address line 2",
      |        "delivery_address_change_city" : "town",
      |        "delivery_address_change_state" : "state",
      |        "delivery_address_change_postcode" : "postcode",
      |        "delivery_address_change_country" : "Afghanistan",
      |        "delivery_address_change_effective_date_blurb" : "Guardian weekly subscription (A-S00060454)  as of front cover dated Friday 10th April 2020\n\n(as displayed on confirmation page at 18:21:07  on 27th March 2020)"
      |      }
      |    }
      |  },
      |  "DataExtensionName" : "SV_DeliveryAddressChangeConfirmation",
      |  "SfContactId" : "0033E00001Chmk9QAB",
      |  "IdentityUserId" : "200002073",
      |  "recordId" : "0033E00001Chmk9QAB"
      |}""".stripMargin

  "Delivery address change Salesforce message" should "transform to Braze SQS message for membership-workflow pickup" in {
    val sfMsg = Json.parse(rawSalesforceMessage).as[SalesforceBatchItems].batch_items.head
    val brazeMsg = BrazeSqsMessage.fromSalesforceMessage(sfMsg)
    val actualRawBrazeSqsMessage = Json.prettyPrint(Json.toJson(brazeMsg))
    actualRawBrazeSqsMessage should ===(expectedRawBrazeSqsMessage)
  }

}

package com.gu.paymentFailure

import com.gu.util.email._
import org.scalatest.matchers.should.Matchers._
import play.api.libs.json.Json
import org.scalatest.flatspec.AnyFlatSpec

class MessageWritesTest extends AnyFlatSpec with EmailSqsSerialisation {

  "Message" should "serialize to the correct json format with payment id" in {
    val message = EmailMessage(
      To = ToDef(
        Address = "fake@email.com",
        SubscriberKey = "subkeyValue",
        ContactAttributes = ContactAttributesDef(
          SubscriberAttributes = SubscriberAttributesDef(
            subscriber_id = "subIdValue",
            product = "productValue",
            payment_method = "paymentMethodValue",
            card_type = "cardTypeValue",
            card_expiry_date = "cardExpiryValue",
            first_name = "firstNameValue",
            last_name = "lastNameValue",
            primaryKey = PaymentId("paymentId"),
            serviceStartDate = "31 January 2016",
            serviceEndDate = "31 January 2017"
          )
        )
      ),
      DataExtensionName = "extensionName",
      SfContactId = "1000000"
    )

    val expectedJson =
      """
        |{
        |  "To": {
        |    "Address": "fake@email.com",
        |    "SubscriberKey": "subkeyValue",
        |    "ContactAttributes": {
        |      "SubscriberAttributes": {
        |        "subscriber_id":"subIdValue",
        |        "product":"productValue",
        |        "payment_method":"paymentMethodValue",
        |        "card_type":"cardTypeValue",
        |        "card_expiry_date":"cardExpiryValue",
        |        "first_name":"firstNameValue",
        |        "last_name":"lastNameValue",
        |        "paymentId":"paymentId",
        |        "serviceStartDate" : "31 January 2016",
        |        "serviceEndDate" : "31 January 2017"
        |      }
        |    }
        |  },
        |  "DataExtensionName": "extensionName",
        |  "SfContactId": "1000000"
        |}
      """.stripMargin

    Json.toJson(message) should be(Json.parse(expectedJson))
  }

  it should "serialize to the correct json format with invoice id" in {
    val message = EmailMessage(
      To = ToDef(
        Address = "fake@email.com",
        SubscriberKey = "subkeyValue",
        ContactAttributes = ContactAttributesDef(
          SubscriberAttributes = SubscriberAttributesDef(
            subscriber_id = "subIdValue",
            product = "productValue",
            payment_method = "paymentMethodValue",
            card_type = "cardTypeValue",
            card_expiry_date = "cardExpiryValue",
            first_name = "firstNameValue",
            last_name = "lastNameValue",
            primaryKey = InvoiceId("paymentId"),
            serviceStartDate = "31 January 2016",
            serviceEndDate = "31 January 2017"
          )
        )
      ),
      DataExtensionName = "extensionName",
      SfContactId = "1000000"
    )

    val expectedJson =
      """
        |{
        |  "To": {
        |    "Address": "fake@email.com",
        |    "SubscriberKey": "subkeyValue",
        |    "ContactAttributes": {
        |      "SubscriberAttributes": {
        |        "subscriber_id":"subIdValue",
        |        "product":"productValue",
        |        "payment_method":"paymentMethodValue",
        |        "card_type":"cardTypeValue",
        |        "card_expiry_date":"cardExpiryValue",
        |        "first_name":"firstNameValue",
        |        "last_name":"lastNameValue",
        |        "invoiceId":"paymentId",
        |        "serviceStartDate" : "31 January 2016",
        |        "serviceEndDate" : "31 January 2017"
        |      }
        |    }
        |  },
        |  "DataExtensionName": "extensionName",
        |  "SfContactId": "1000000"
        |}
      """.stripMargin

    Json.toJson(message) should be(Json.parse(expectedJson))
  }

}

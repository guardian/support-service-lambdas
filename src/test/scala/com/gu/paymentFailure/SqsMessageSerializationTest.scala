package com.gu.paymentFailure

import com.gu.util.exacttarget._
import org.scalatest.FlatSpec
import org.scalatest.Matchers._
import org.scalatest.mockito.MockitoSugar
import play.api.libs.json.Json

class SqsMessageSerializationTest extends FlatSpec with MockitoSugar {

  "Message" should "serialize to the correct json format with payemnt id" in {
    val message = Message(
      To = ToDef(
        Address = "fake@email.com",
        SubscriberKey = "subkeyValue",
        ContactAttributes = ContactAttributesDef(
          SubscriberAttributes = SubscriberAttributesDef(
            SubscriberKey = "subKeyValue",
            EmailAddress = "fake@email.com",
            subscriber_id = "subIdValue",
            product = "productValue",
            payment_method = "paymentMethodValue",
            card_type = "cardTypeValue",
            card_expiry_date = "cardExpiryValue",
            first_name = "firstNameValue",
            last_name = "lastNameValue",
            primaryKey = PaymentId("paymentId"),
            price = "49.0 GBP",
            serviceStartDate = "31 January 2016",
            serviceEndDate = "31 January 2017"
          )
        )
      )
    )

    val expectedJson =
      """
        |{
        |  "To": {
        |    "Address": "fake@email.com",
        |    "SubscriberKey": "subkeyValue",
        |    "ContactAttributes": {
        |      "SubscriberAttributes": {
        |        "SubscriberKey":"subKeyValue",
        |        "EmailAddress":"fake@email.com",
        |        "subscriber_id":"subIdValue",
        |        "product":"productValue",
        |        "payment_method":"paymentMethodValue",
        |        "card_type":"cardTypeValue",
        |        "card_expiry_date":"cardExpiryValue",
        |        "first_name":"firstNameValue",
        |        "last_name":"lastNameValue",
        |        "paymentId":"paymentId",
        |        "price":"49.0 GBP",
        |        "serviceStartDate" : "31 January 2016",
        |        "serviceEndDate" : "31 January 2017"
        |      }
        |    }
        |  }
        |}
      """.stripMargin

    Json.toJson(message) should be(Json.parse(expectedJson))
  }

  it should "serialize to the correct json format with invoice id" in {
    val message = Message(
      To = ToDef(
        Address = "fake@email.com",
        SubscriberKey = "subkeyValue",
        ContactAttributes = ContactAttributesDef(
          SubscriberAttributes = SubscriberAttributesDef(
            SubscriberKey = "subKeyValue",
            EmailAddress = "fake@email.com",
            subscriber_id = "subIdValue",
            product = "productValue",
            payment_method = "paymentMethodValue",
            card_type = "cardTypeValue",
            card_expiry_date = "cardExpiryValue",
            first_name = "firstNameValue",
            last_name = "lastNameValue",
            primaryKey = InvoiceId("paymentId"),
            price = "49.0 GBP",
            serviceStartDate = "31 January 2016",
            serviceEndDate = "31 January 2017"
          )
        )
      )
    )

    val expectedJson =
      """
        |{
        |  "To": {
        |    "Address": "fake@email.com",
        |    "SubscriberKey": "subkeyValue",
        |    "ContactAttributes": {
        |      "SubscriberAttributes": {
        |        "SubscriberKey":"subKeyValue",
        |        "EmailAddress":"fake@email.com",
        |        "subscriber_id":"subIdValue",
        |        "product":"productValue",
        |        "payment_method":"paymentMethodValue",
        |        "card_type":"cardTypeValue",
        |        "card_expiry_date":"cardExpiryValue",
        |        "first_name":"firstNameValue",
        |        "last_name":"lastNameValue",
        |        "invoiceId":"paymentId",
        |        "price":"49.0 GBP",
        |        "serviceStartDate" : "31 January 2016",
        |        "serviceEndDate" : "31 January 2017"
        |      }
        |    }
        |  }
        |}
      """.stripMargin

    Json.toJson(message) should be(Json.parse(expectedJson))
  }

}

package com.gu.paymentFailure

import org.scalatest.Matchers._
import org.scalatest.{ FlatSpec, _ }
import org.scalatest.mockito.MockitoSugar
import play.api.libs.json.Json

class SqsMessageSerializationTest extends FlatSpec with MockitoSugar {

  "Message" should "serialize to the correct json format" in {
    val message = Message(
      DataExtensionName = "dataExtensionNameValue",
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
            payment_id = "paymentId",
            price = "49.0 GBP"
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
        |        "payment_id":"paymentId",
        |        "price":"49.0 GBP"
        |      }
        |    }
        |  },
        |  "DataExtensionName": "dataExtensionNameValue"
        |}
      """.stripMargin

    Json.toJson(message) should be(Json.parse(expectedJson))
  }

}

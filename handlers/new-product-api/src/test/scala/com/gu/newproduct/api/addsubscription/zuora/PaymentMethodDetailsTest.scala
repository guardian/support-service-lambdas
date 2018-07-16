package com.gu.newproduct.api.addsubscription.zuora

import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethodDetails.{Active, Closed, PaymentMethodDetails}
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.{JsError, Json}

class PaymentMethodDetailsTest extends FlatSpec with Matchers {
    it should "deserialize correctly active payment method" in {
      val input =
        """{
          |"PaymentMethodStatus": "Active"
          |}
        """.stripMargin

      val actual = Json.parse(input).as[PaymentMethodDetails]

      actual shouldBe PaymentMethodDetails(Active)
    }

  it should "deserialize correctly closed payment method" in {
    val input =
      """{
        |"PaymentMethodStatus": "Closed"
        |}
      """.stripMargin

    val actual = Json.parse(input).as[PaymentMethodDetails]

    actual shouldBe PaymentMethodDetails(Closed)
  }
  it should "return error if unknonwn payment method status" in {
    val input =
      """{
        |"PaymentMethodStatus": "unknown value here"
        |}
      """.stripMargin

    val actual = Json.parse(input).validate[PaymentMethodDetails]

    actual shouldBe JsError("unknown payment method status: 'unknown value here'")
  }
  }
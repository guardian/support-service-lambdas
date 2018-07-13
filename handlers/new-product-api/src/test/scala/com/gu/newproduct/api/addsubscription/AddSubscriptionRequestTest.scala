package com.gu.newproduct.api.addsubscription

import java.time.LocalDate

import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.{JsError, Json}

class AddSubscriptionRequestTest extends FlatSpec with Matchers {
  it should "deserialize correctly" in {
    val input =
      """{
        |   "zuoraAccountId":"accountkeyValue",
        |   "startDate":"2018-07-11",
        |   "acquisitionSource":"CSR",
        |   "createdByCSR":"CSRName",
        |   "amountMinorUnits": 123
        |}
      """.stripMargin

    val actual = Json.parse(input).as[AddSubscriptionRequest]

    actual shouldBe AddSubscriptionRequest(
      zuoraAccountId = ZuoraAccountId("accountkeyValue"),
      startDate = LocalDate.of(2018, 7, 11),
      acquisitionSource = "CSR",
      createdByCSR = "CSRName",
      amountMinorUnits = 123
    )
  }

  it should "fail if wrong date format" in {
    val input =
      """{
        |   "zuoraAccountId":"accountkeyValue",
        |   "startDate":"december 7, 2018",
        |   "productRatePlanId":"rateplanId",
        |   "productRatePlanChargeId":"rateplanChargeId",
        |   "acquisitionSource":"CSR",
        |   "createdByCSR":"CSRName",
        |   "amountMinorUnits": 220
        |}
      """.stripMargin

    Json.parse(input).validate[AddSubscriptionRequest] shouldBe JsError("invalid date format")

  }
}


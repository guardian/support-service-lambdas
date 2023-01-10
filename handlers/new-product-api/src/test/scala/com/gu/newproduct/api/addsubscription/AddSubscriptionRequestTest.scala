package com.gu.newproduct.api.addsubscription

import java.time.LocalDate

import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, PlanId}
import com.gu.newproduct.api.productcatalog.PlanId.MonthlyContribution
import play.api.libs.json.{JsError, Json}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class AddSubscriptionRequestTest extends AnyFlatSpec with Matchers {
  it should "deserialize correctly" in {
    val input =
      """{
        |   "zuoraAccountId":"accountkeyValue",
        |   "startDate":"2018-07-11",
        |   "acquisitionSource":"CSR",
        |   "createdByCSR":"CSRName",
        |   "amountMinorUnits": 123,
        |   "acquisitionCase": "5006E000005b5cf",
        |   "planId": "monthly_contribution"
        |}
      """.stripMargin

    val actual = Json.parse(input).as[AddSubscriptionRequest]

    actual shouldBe AddSubscriptionRequest(
      zuoraAccountId = ZuoraAccountId("accountkeyValue"),
      startDate = LocalDate.of(2018, 7, 11),
      acquisitionSource = AcquisitionSource("CSR"),
      createdByCSR = CreatedByCSR("CSRName"),
      amountMinorUnits = Some(AmountMinorUnits(123)),
      acquisitionCase = CaseId("5006E000005b5cf"),
      planId = MonthlyContribution,
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
        |   "amountMinorUnits": 220,
        |   "acquisitionCase": "5006E000005b5cf",
        |   "planId": "monthly_contribution"
        |}
      """.stripMargin

    Json.parse(input).validate[AddSubscriptionRequest] shouldBe JsError("invalid date format")
  }

  it should "fail if unsupported plan" in {
    val input =
      """{
        |   "zuoraAccountId":"accountkeyValue",
        |   "startDate":"2018-07-11",
        |   "productRatePlanId":"rateplanId",
        |   "productRatePlanChargeId":"rateplanChargeId",
        |   "acquisitionSource":"CSR",
        |   "createdByCSR":"CSRName",
        |   "amountMinorUnits": 220,
        |   "acquisitionCase": "5006E000005b5cf",
        |   "planId": "invalid_plan_id"
        |}
      """.stripMargin

    val supportedPlansStr = PlanId.supportedPlans.map(_.name).mkString(",")
    Json.parse(input).validate[AddSubscriptionRequest] shouldBe JsError(
      s"unsupported plan: allowed values are $supportedPlansStr",
    )
  }
}

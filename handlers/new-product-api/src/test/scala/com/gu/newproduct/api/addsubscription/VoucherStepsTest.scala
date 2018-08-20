package com.gu.newproduct.api.addsubscription

import java.time.LocalDate

import com.gu.newproduct.TestData
import com.gu.newproduct.api.addsubscription.validation._
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.ZuoraCreateSubRequest
import com.gu.newproduct.api.productcatalog.PlanId
import com.gu.test.JsonMatchers.JsonMatcher
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json._

import scala.concurrent.Await
import scala.concurrent.duration._
import scala.language.postfixOps

class VoucherStepsTest extends FlatSpec with Matchers {

  case class ExpectedOut(subscriptionNumber: String)

  it should "run end to end with fakes" in {

    val expectedIn = ZuoraCreateSubRequest(
      ZuoraAccountId("acccc"),
      AmountMinorUnits(123),
      LocalDate.of(2018, 7, 18),
      LocalDate.of(2018, 7, 28),
      CaseId("case"),
      AcquisitionSource("CSR"),
      CreatedByCSR("bob")
    )

    def fakeGetVoucherCustomerData(zuoraAccountId: ZuoraAccountId) = ContinueProcessing(TestData.voucherCustomerData)

    val requestInput = JsObject(Map(
      "acquisitionCase" -> JsString("case"),
      "amountMinorUnits" -> JsNumber(123),
      "startDate" -> JsString("2018-07-18"),
      "zuoraAccountId" -> JsString("acccc"),
      "acquisitionSource" -> JsString("CSR"),
      "createdByCSR" -> JsString("bob"),
      "planId" -> JsString("voucher_everyday")

    ))

    implicit val format: OFormat[ExpectedOut] = Json.format[ExpectedOut]
    val expectedOutput = ExpectedOut("fakeSubId")

    val dummyContributionSteps = (req: AddSubscriptionRequest) => {
      fail("unexpected execution of contribution steps while processing voucher request!")
    }

    def fakeValidateVoucherStartDate(id: PlanId, d: LocalDate) = Passed(())

    val fakeAddVoucherSteps = Steps.addVoucherSteps(
      fakeGetVoucherCustomerData,
      fakeValidateVoucherStartDate
    ) _

    val futureActual = Steps.handleRequest(
      addContribution = dummyContributionSteps,
      addVoucher = fakeAddVoucherSteps
    )(ApiGatewayRequest(None, Some(Json.stringify(requestInput)), None, None))

    val actual = Await.result(futureActual, 30 seconds)
    actual.statusCode should be("200")
    actual.body jsonMatchesFormat expectedOutput
  }

}

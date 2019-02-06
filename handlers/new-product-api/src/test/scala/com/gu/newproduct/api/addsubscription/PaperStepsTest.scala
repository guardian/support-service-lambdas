package com.gu.newproduct.api.addsubscription

import java.time.LocalDate

import com.gu.newproduct.TestData
import com.gu.newproduct.api.addsubscription.email.paper.PaperEmailData
import com.gu.newproduct.api.addsubscription.validation._
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{SubscriptionName, ZuoraCreateSubRequest}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.productcatalog.PlanId.VoucherEveryDay
import com.gu.newproduct.api.productcatalog.{Plan, PlanDescription, PlanId}
import com.gu.newproduct.api.productcatalog.ZuoraIds.ProductRatePlanId
import com.gu.test.JsonMatchers.JsonMatcher
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.resthttp.Types
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json._
import com.gu.util.reader.AsyncTypes._

import scala.concurrent.Await
import scala.concurrent.duration._
import scala.language.postfixOps

class PaperStepsTest extends FlatSpec with Matchers {

  case class ExpectedOut(subscriptionNumber: String)

  it should "run end to end with fakes" in {
    val ratePlanId = ProductRatePlanId("ratePlanId")

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
    val expectedOutput = ExpectedOut("well done")

    val dummyContributionSteps = (req: AddSubscriptionRequest) => {
      fail("unexpected execution of contribution steps while processing voucher request!")
    }

    val expectedIn = ZuoraCreateSubRequest(
      ratePlanId,
      ZuoraAccountId("acccc"),
      None,
      LocalDate.of(2018, 7, 18),
      CaseId("case"),
      AcquisitionSource("CSR"),
      CreatedByCSR("bob")
    )

    def fakeCreate(in: CreateSubscription.ZuoraCreateSubRequest): Types.ClientFailableOp[CreateSubscription.SubscriptionName] = {
      in shouldBe expectedIn
      ClientSuccess(SubscriptionName("well done"))
    }

    val fakeGetZuoraId = (planId: PlanId) => {
      planId shouldBe VoucherEveryDay
      Some(ratePlanId)
    }

    //todo maybe add assertions on the input params for these two
    def fakeValidateVoucherStartDate(id: PlanId, d: LocalDate) = Passed(())

    def fakeSendEmail(sfContactId: Option[SfContactId], paperData: PaperEmailData) = ContinueProcessing(()).toAsync

    def fakeGetPlan(planId: PlanId) = Plan(VoucherEveryDay, PlanDescription("Everyday"))
    val fakeAddVoucherSteps = AddPaperSub.steps(
      fakeGetPlan,
      fakeGetZuoraId,
      fakeGetVoucherCustomerData,
      fakeValidateVoucherStartDate,
      fakeCreate,
      fakeSendEmail
    ) _

    val futureActual = Steps.handleRequest(
      addContribution = dummyContributionSteps,
      addPaperSub = fakeAddVoucherSteps
    )(ApiGatewayRequest(None, Some(Json.stringify(requestInput)), None, None))

    val actual = Await.result(futureActual, 30 seconds)
    actual.statusCode should be("200")
    actual.body jsonMatchesFormat expectedOutput
  }

}

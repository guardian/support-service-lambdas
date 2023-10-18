package com.gu.newproduct.api.addsubscription

import com.gu.newproduct.TestData
import com.gu.newproduct.api.addsubscription.email.PaperEmailData
import com.gu.newproduct.api.addsubscription.validation._
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{
  SubscriptionName,
  ZuoraCreateSubRequest,
  ZuoraCreateSubRequestRatePlan,
}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.SoldToAddress
import com.gu.newproduct.api.productcatalog.PlanId.VoucherEveryDay
import com.gu.newproduct.api.productcatalog.RuleFixtures.testStartDateRules
import com.gu.newproduct.api.productcatalog.ZuoraIds.ProductRatePlanId
import com.gu.newproduct.api.productcatalog.{Plan, PlanDescription, PlanId}
import com.gu.test.JsonMatchers.JsonMatcher
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.reader.AsyncTypes._
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.resthttp.Types
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json._

import java.time.LocalDate
import scala.concurrent.Await
import scala.concurrent.duration._
import scala.language.postfixOps

class PaperStepsTest extends AnyFlatSpec with Matchers {

  case class ExpectedOut(subscriptionNumber: String)

  it should "run end to end with fakes" in {
    val ratePlanId = ProductRatePlanId("ratePlanId")

    def fakeGetVoucherCustomerData(zuoraAccountId: ZuoraAccountId) = ContinueProcessing(TestData.voucherCustomerData)

    val requestInput = JsObject(
      Map(
        "acquisitionCase" -> JsString("case"),
        "amountMinorUnits" -> JsNumber(123),
        "startDate" -> JsString("2018-07-18"),
        "zuoraAccountId" -> JsString("acccc"),
        "acquisitionSource" -> JsString("CSR"),
        "createdByCSR" -> JsString("bob"),
        "planId" -> JsString("voucher_everyday"),
      ),
    )

    implicit val format: OFormat[ExpectedOut] = Json.format[ExpectedOut]
    val expectedOutput = ExpectedOut("well done")

    val dummySteps = new AddSpecificProduct {
      override def addProduct(request: AddSubscriptionRequest): AsyncApiGatewayOp[SubscriptionName] =
        fail("unexpected execution of voucher steps while processing contribution request!")
    }

    val expectedIn = ZuoraCreateSubRequest(
      accountId = ZuoraAccountId("acccc"),
      acceptanceDate = LocalDate.of(2018, 7, 18),
      acquisitionCase = CaseId("case"),
      acquisitionSource = AcquisitionSource("CSR"),
      createdByCSR = CreatedByCSR("bob"),
      deliveryAgent = None,
      ratePlans = List(
        ZuoraCreateSubRequestRatePlan(
          productRatePlanId = ratePlanId,
          maybeChargeOverride = None,
        ),
      ),
    )

    def fakeCreate(
        in: CreateSubscription.ZuoraCreateSubRequest,
    ): Types.ClientFailableOp[CreateSubscription.SubscriptionName] = {
      in shouldBe expectedIn
      ClientSuccess(SubscriptionName("well done"))
    }

    val fakeGetZuoraId = (planId: PlanId) => {
      planId shouldBe VoucherEveryDay
      Some(ratePlanId)
    }

    def fakeValidateStartDate(id: PlanId, d: LocalDate) = Passed(())

    def fakeValidateAddress(id: PlanId, a: SoldToAddress) = Passed(())

    def fakeSendEmail(sfContactId: Option[SfContactId], paperData: PaperEmailData) = ContinueProcessing(()).toAsync

    def fakeGetPlan(planId: PlanId) = Plan(VoucherEveryDay, PlanDescription("Everyday"), testStartDateRules)
    val fakeAddVoucherSteps = new AddPaperSub(
      fakeGetPlan,
      fakeGetZuoraId,
      fakeGetVoucherCustomerData,
      fakeValidateStartDate,
      fakeValidateAddress,
      fakeCreate,
      fakeSendEmail,
    )

    val futureActual = new handleRequest(
      addSupporterPlus = dummySteps,
      addContribution = dummySteps,
      addPaperSub = fakeAddVoucherSteps,
      addDigipackSub = dummySteps,
      addGuardianWeeklyDomesticSub = dummySteps,
      addGuardianWeeklyROWSub = dummySteps,
    )(ApiGatewayRequest(None, None, Some(Json.stringify(requestInput)), None, None, None))

    val actual = Await.result(futureActual, 30 seconds)
    actual.statusCode should be("200")
    actual.body jsonMatchesFormat expectedOutput
  }

}

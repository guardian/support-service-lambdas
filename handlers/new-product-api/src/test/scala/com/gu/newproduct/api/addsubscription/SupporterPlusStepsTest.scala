package com.gu.newproduct.api.addsubscription

import com.gu.i18n.Currency
import com.gu.i18n.Currency.GBP
import com.gu.newproduct.TestData
import com.gu.newproduct.api.addsubscription.email.SupporterPlusEmailData
import com.gu.newproduct.api.addsubscription.validation.supporterplus.SupporterPlusValidations.ValidatableFields
import com.gu.newproduct.api.addsubscription.validation.{Failed, Passed}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{ChargeOverride, SubscriptionName, ZuoraCreateSubRequest, ZuoraCreateSubRequestRatePlan}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.productcatalog.PlanId.MonthlySupporterPlus
import com.gu.newproduct.api.productcatalog.RuleFixtures.testStartDateRules
import com.gu.newproduct.api.productcatalog.ZuoraIds.{PlanAndCharges, ProductRatePlanChargeId, ProductRatePlanId}
import com.gu.newproduct.api.productcatalog._
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

class SupporterPlusStepsTest extends AnyFlatSpec with Matchers {
  case class ExpectedOut(subscriptionNumber: String)

  it should "run end to end with fakes" in {
    val planAndCharge = PlanAndCharges(
      ProductRatePlanId("ratePlanId"),
      ProductRatePlanChargeId("ratePlanChargeId"),
      ProductRatePlanChargeId("contributionRatePlanChargeId"),
    )

    def getPlanAndCharge(planId: PlanId) = Some(planAndCharge)

    val expectedIn = ZuoraCreateSubRequest(
      ZuoraAccountId("acccc"),
      LocalDate.of(2018, 7, 18),
      CaseId("case"),
      AcquisitionSource("CSR"),
      CreatedByCSR("bob"),
      ratePlans = List(
        ZuoraCreateSubRequestRatePlan(
          productRatePlanId = planAndCharge.productRatePlanId,
          maybeChargeOverride = Some(
            ChargeOverride(
              amountMinorUnits = Some(AmountMinorUnits(1000)),
              productRatePlanChargeId = planAndCharge.contributionProductRatePlanChargeId,
              triggerDate = None,
            ),
          ),
        ),
      ),
    )

    def fakeCreate(
        in: CreateSubscription.ZuoraCreateSubRequest,
    ): Types.ClientFailableOp[CreateSubscription.SubscriptionName] = {
      in shouldBe expectedIn
      ClientSuccess(SubscriptionName("well done"))
    }

    def fakeSendEmails(sfContactId: Option[SfContactId], supporterPlusEmailData: SupporterPlusEmailData) = {
      ContinueProcessing(()).toAsync
    }

    def fakeValidateRequest(fields: ValidatableFields, planId: PlanId, currency: Currency) = {
      fields.amountMinorUnits.map(Passed(_)).getOrElse(Failed("missing amount"))
    }

    def fakeGetCustomerData(zuoraAccountId: ZuoraAccountId) = ContinueProcessing(TestData.supporterPlusCustomerData)

    def getPlan(planId: PlanId) = Plan(
      MonthlySupporterPlus,
      PlanDescription("some description"),
      testStartDateRules,
      Map(GBP -> PaymentPlan(GBP, AmountMinorUnits(1000), Monthly, "monthly")),
    )

    def currentDate() = LocalDate.of(2018, 12, 12)

    val requestInput = JsObject(
      Map(
        "acquisitionCase" -> JsString("case"),
        "amountMinorUnits" -> JsNumber(2000),
        "startDate" -> JsString("2018-07-18"),
        "zuoraAccountId" -> JsString("acccc"),
        "acquisitionSource" -> JsString("CSR"),
        "createdByCSR" -> JsString("bob"),
        "planId" -> JsString("monthly_supporter_plus"),
      ),
    )

    implicit val format: OFormat[ExpectedOut] = Json.format[ExpectedOut]
    val expectedOutput = ExpectedOut("well done")

    val fakeAddSupporterPlusSteps = AddSupporterPlus.steps(
      getPlan,
      currentDate _,
      getPlanAndCharge,
      fakeGetCustomerData,
      fakeValidateRequest,
      fakeCreate,
      fakeSendEmails,
    ) _

    val dummySteps = (req: AddSubscriptionRequest) => {
      fail("unexpected execution of voucher steps while processing contribution request!")
    }
    val futureActual = Steps.handleRequest(
      addSupporterPlus = fakeAddSupporterPlusSteps,
      addContribution = dummySteps,
      addPaperSub = dummySteps,
      addDigipackSub = dummySteps,
      addGuardianWeeklyDomesticSub = dummySteps,
      addGuardianWeeklyROWSub = dummySteps,
    )(ApiGatewayRequest(None, None, Some(Json.stringify(requestInput)), None, None, None))

    val actual = Await.result(futureActual, 30 seconds)
    actual.statusCode should be("200")
    actual.body jsonMatchesFormat expectedOutput
  }

}

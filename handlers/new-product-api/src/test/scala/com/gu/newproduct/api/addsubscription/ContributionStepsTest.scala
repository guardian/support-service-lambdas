package com.gu.newproduct.api.addsubscription

import com.gu.i18n.Currency
import com.gu.newproduct.TestData
import com.gu.newproduct.api.addsubscription.email.ContributionsEmailData
import com.gu.newproduct.api.addsubscription.validation.contribution.ContributionValidations.ValidatableFields
import com.gu.newproduct.api.addsubscription.validation.{Failed, Passed}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{
  ChargeOverride,
  SubscriptionName,
  ZuoraCreateSubRequest,
  ZuoraCreateSubRequestRatePlan,
}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.productcatalog.PlanId.MonthlyContribution
import com.gu.newproduct.api.productcatalog.RuleFixtures.testStartDateRules
import com.gu.newproduct.api.productcatalog.ZuoraIds.{PlanAndCharge, ProductRatePlanChargeId, ProductRatePlanId}
import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, Plan, PlanDescription, PlanId}
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

class ContributionStepsTest extends AnyFlatSpec with Matchers {

  case class ExpectedOut(subscriptionNumber: String)

  it should "run end to end with fakes" in {

    val planAndCharge = PlanAndCharge(
      ProductRatePlanId("ratePlanId"),
      ProductRatePlanChargeId("ratePlanChargeId"),
    )

    def getPlanAndCharge(planId: PlanId) = Some(planAndCharge)

    val expectedIn = ZuoraCreateSubRequest(
      accountId = ZuoraAccountId("acccc"),
      acceptanceDate = LocalDate.of(2018, 7, 18),
      acquisitionCase = CaseId("case"),
      acquisitionSource = AcquisitionSource("CSR"),
      createdByCSR = CreatedByCSR("bob"),
      deliveryAgent = None,
      ratePlans = List(
        ZuoraCreateSubRequestRatePlan(
          productRatePlanId = planAndCharge.productRatePlanId,
          maybeChargeOverride = Some(
            ChargeOverride(
              amountMinorUnits = Some(AmountMinorUnits(123)),
              productRatePlanChargeId = planAndCharge.productRatePlanChargeId,
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

    def fakeSendEmails(sfContactId: Option[SfContactId], contributionsEmailData: ContributionsEmailData) = {
      ContinueProcessing(()).toAsync
    }

    def fakeValidateRequest(fields: ValidatableFields, planId: PlanId, currency: Currency) = {
      fields.amountMinorUnits.map(Passed(_)).getOrElse(Failed("missing amount"))
    }

    def fakeGetCustomerData(zuoraAccountId: ZuoraAccountId) = ContinueProcessing(TestData.contributionCustomerData)

    def getPlan: Map[PlanId, Plan] =
      Map().withDefaultValue(Plan(MonthlyContribution, PlanDescription("some description"), testStartDateRules))

    def currentDate() = LocalDate.of(2018, 12, 12)

    val requestInput = JsObject(
      Map(
        "acquisitionCase" -> JsString("case"),
        "amountMinorUnits" -> JsNumber(123),
        "startDate" -> JsString("2018-07-18"),
        "zuoraAccountId" -> JsString("acccc"),
        "acquisitionSource" -> JsString("CSR"),
        "createdByCSR" -> JsString("bob"),
        "planId" -> JsString("monthly_contribution"),
      ),
    )

    implicit val format: OFormat[ExpectedOut] = Json.format[ExpectedOut]
    val expectedOutput = ExpectedOut("well done")

    val fakeAddContributionSteps = AddContribution.steps(
      getPlan,
      currentDate _,
      getPlanAndCharge,
      fakeGetCustomerData,
      fakeValidateRequest,
      fakeCreate,
      fakeSendEmails,
    ) _
    // todo separate the tests properly so that we don't need this anymore (and the same in the PaperStepsTest)

    val dummySteps = (req: AddSubscriptionRequest) => {
      fail("unexpected execution of voucher steps while processing contribution request!")
    }
    val futureActual = Steps.handleRequest(
      addSupporterPlus = dummySteps,
      addContribution = fakeAddContributionSteps,
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

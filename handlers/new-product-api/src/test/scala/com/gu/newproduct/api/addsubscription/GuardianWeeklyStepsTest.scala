package com.gu.newproduct.api.addsubscription

import java.time.LocalDate

import com.gu.newproduct.TestData
import com.gu.newproduct.api.addsubscription.email.GuardianWeeklyEmailData
import com.gu.newproduct.api.addsubscription.validation._
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{ChargeOverride, SubscriptionName, ZuoraCreateSubRequest, ZuoraCreateSubRequestRatePlan}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{BillToAddress, SoldToAddress}
import com.gu.newproduct.api.productcatalog.PlanId.{GuardianWeeklyDomestic6for6, GuardianWeeklyDomesticQuarterly}
import com.gu.newproduct.api.productcatalog.RuleFixtures.testStartDateRules
import com.gu.newproduct.api.productcatalog.ZuoraIds.{PlanAndCharge, ProductRatePlanChargeId, ProductRatePlanId}
import com.gu.newproduct.api.productcatalog.{Plan, PlanDescription, PlanId}
import com.gu.test.JsonMatchers.JsonMatcher
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.reader.AsyncTypes._
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.resthttp.Types
import com.gu.util.resthttp.Types.ClientSuccess
import play.api.libs.json._

import scala.concurrent.Await
import scala.concurrent.duration._
import scala.language.postfixOps
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GuardianWeeklyStepsTest extends AnyFlatSpec with Matchers {
  val quarterlyTestRatePlanZuoraId = ProductRatePlanId("quarterly-zuora-rate-plan-id")
  val sixForSixTestRatePlanZuoraId = ProductRatePlanId("6-for-6-zuora-rate-plan-id")
  val sixForSixTestRatePlanChargeZuoraId = ProductRatePlanChargeId("6-for-6-zuora-rate-plan-charge-id")

  val newSubscriptionName = "A-Sxxxxxxxx"
  val testFirstPaymentDate = LocalDate.of(2018, 7, 18)
  val testZuoraAccountId = ZuoraAccountId("acccc")
  val quarterlyRatePlan = Plan(GuardianWeeklyDomesticQuarterly, PlanDescription("GW Oct 18 - Quarterly - Domestic"), testStartDateRules)
  val sixForSixRatePlan = Plan(GuardianWeeklyDomestic6for6, PlanDescription("GW Oct 18 - 6 for 6 - Domestic"), testStartDateRules)
  val testCaseId = CaseId("case")
  val testAcquistionSource = AcquisitionSource("CSR")
  val testCSR = CreatedByCSR("bob")

  def stubGetVoucherCustomerData(zuoraAccountId: ZuoraAccountId) = {
    zuoraAccountId should equal(testZuoraAccountId)
    ContinueProcessing(TestData.guardianWeeklyCustomerData)
  }

  def stubValidateAddress(billingAddress: BillToAddress, deliveryAddress: SoldToAddress) = {
    billingAddress should equal(TestData.guardianWeeklyCustomerData.contacts.billTo.address)
    deliveryAddress should equal(TestData.guardianWeeklyCustomerData.contacts.soldTo.address)
    Passed(())
  }

  def stubGetZuoraId(planId: PlanId) = {
    planId match {
      case GuardianWeeklyDomesticQuarterly => Some(quarterlyTestRatePlanZuoraId)
      case GuardianWeeklyDomestic6for6 => Some(sixForSixTestRatePlanZuoraId)
      case _ => fail()
    }
  }

  def stubGetPlanAndCharge(planId: PlanId): Option[PlanAndCharge] = {
    planId match {
      case GuardianWeeklyDomestic6for6 => Some(PlanAndCharge(sixForSixTestRatePlanZuoraId, sixForSixTestRatePlanChargeZuoraId))
      case _ => fail()
    }
  }

  def stubValidateStartDate(expectedPlanId: PlanId)(planId: PlanId, startDate: LocalDate) = {
    planId should equal(expectedPlanId)
    startDate should equal(testFirstPaymentDate)
    Passed(())
  }

  def stubSendEmail(expectedPlan: Plan)(sfContactId: Option[SfContactId], paperData: GuardianWeeklyEmailData) = {
    sfContactId should equal(TestData.guardianWeeklyCustomerData.account.sfContactId)
    paperData.subscriptionName should equal(SubscriptionName(newSubscriptionName))
    paperData.contacts should equal(TestData.guardianWeeklyCustomerData.contacts)
    paperData.currency should equal(TestData.guardianWeeklyCustomerData.account.currency)
    paperData.firstPaymentDate should equal(testFirstPaymentDate)
    paperData.paymentMethod should equal(TestData.guardianWeeklyCustomerData.paymentMethod)
    paperData.plan should equal(expectedPlan)
    ContinueProcessing(()).toAsync
  }

  def stubGetPlan(planId: PlanId) = {
    planId match {
      case GuardianWeeklyDomesticQuarterly => quarterlyRatePlan
      case GuardianWeeklyDomestic6for6 => sixForSixRatePlan
      case _ => fail()
    }
  }

  val dummySteps = (req: AddSubscriptionRequest) => {
    fail("unexpected execution of contribution steps while processing voucher request!")
  }

  it should "create subscription for non 6-for-6 rate plan" in {
    def stubCreate(request: CreateSubscription.ZuoraCreateSubRequest): Types.ClientFailableOp[CreateSubscription.SubscriptionName] = {
      request shouldBe ZuoraCreateSubRequest(
        testZuoraAccountId,
        testFirstPaymentDate,
        testCaseId,
        testAcquistionSource,
        testCSR,
        List(
          ZuoraCreateSubRequestRatePlan(
            productRatePlanId = quarterlyTestRatePlanZuoraId,
            maybeChargeOverride = None
          )
        )
      )
      ClientSuccess(SubscriptionName(newSubscriptionName))
    }

    val stubAddVoucherSteps = AddGuardianWeeklySub.steps(
      stubGetPlan,
      stubGetZuoraId,
      stubGetPlanAndCharge,
      stubGetVoucherCustomerData,
      stubValidateStartDate(GuardianWeeklyDomesticQuarterly),
      stubValidateAddress,
      stubCreate,
      stubSendEmail(quarterlyRatePlan),
      GuardianWeeklyDomestic6for6,
      GuardianWeeklyDomesticQuarterly
    ) _

    val futureActual = Steps.handleRequest(
      addSupporterPlus = dummySteps,
      addContribution = dummySteps,
      addPaperSub = dummySteps,
      addDigipackSub = dummySteps,
      addGuardianWeeklyDomesticSub = stubAddVoucherSteps,
      addGuardianWeeklyROWSub = stubAddVoucherSteps
    )(ApiGatewayRequest(None, None, Some(Json.stringify(JsObject(
      Map(
        "acquisitionCase" -> JsString(testCaseId.value),
        "startDate" -> JsString(testFirstPaymentDate.toString),
        "zuoraAccountId" -> JsString(testZuoraAccountId.value),
        "acquisitionSource" -> JsString(testAcquistionSource.value),
        "createdByCSR" -> JsString(testCSR.value),
        "planId" -> JsString(GuardianWeeklyDomesticQuarterly.name)
      )
    ))), None, None, None))

    implicit val format: OFormat[AddedSubscription] = Json.format[AddedSubscription]
    val actual = Await.result(futureActual, 30 seconds)
    actual.statusCode should be("200")
    actual.body jsonMatchesFormat AddedSubscription(newSubscriptionName)
  }

  it should "create subscription for 6-for-6 rate plan" in {
    val monthlySubscriptionStartDate = testFirstPaymentDate.plusWeeks(6)

    def stubCreate(request: CreateSubscription.ZuoraCreateSubRequest): Types.ClientFailableOp[CreateSubscription.SubscriptionName] = {
      request shouldBe ZuoraCreateSubRequest(
        testZuoraAccountId,
        monthlySubscriptionStartDate,
        testCaseId,
        testAcquistionSource,
        testCSR,
        List(
          ZuoraCreateSubRequestRatePlan(
            productRatePlanId = sixForSixTestRatePlanZuoraId,
            maybeChargeOverride = Some(
              ChargeOverride(
                amountMinorUnits = None,
                productRatePlanChargeId = sixForSixTestRatePlanChargeZuoraId,
                triggerDate = Some(testFirstPaymentDate)
              )
            )
          ),
          ZuoraCreateSubRequestRatePlan(
            productRatePlanId = quarterlyTestRatePlanZuoraId,
            maybeChargeOverride = None
          )
        )
      )
      ClientSuccess(SubscriptionName(newSubscriptionName))
    }

    val stubAddVoucherSteps = AddGuardianWeeklySub.steps(
      stubGetPlan,
      stubGetZuoraId,
      stubGetPlanAndCharge,
      stubGetVoucherCustomerData,
      stubValidateStartDate(GuardianWeeklyDomestic6for6),
      stubValidateAddress,
      stubCreate,
      stubSendEmail(sixForSixRatePlan),
      GuardianWeeklyDomestic6for6,
      GuardianWeeklyDomesticQuarterly
    ) _

    val futureActual = Steps.handleRequest(
      addSupporterPlus = dummySteps,
      addContribution = dummySteps,
      addPaperSub = dummySteps,
      addDigipackSub = dummySteps,
      addGuardianWeeklyDomesticSub = stubAddVoucherSteps,
      addGuardianWeeklyROWSub = stubAddVoucherSteps
    )(ApiGatewayRequest(None, None, Some(Json.stringify(JsObject(
      Map(
        "acquisitionCase" -> JsString(testCaseId.value),
        "startDate" -> JsString(testFirstPaymentDate.toString),
        "zuoraAccountId" -> JsString(testZuoraAccountId.value),
        "acquisitionSource" -> JsString(testAcquistionSource.value),
        "createdByCSR" -> JsString(testCSR.value),
        "planId" -> JsString(GuardianWeeklyDomestic6for6.name)
      )
    ))), None, None, None))

    implicit val format: OFormat[AddedSubscription] = Json.format[AddedSubscription]
    val actual = Await.result(futureActual, 30 seconds)
    actual.statusCode should be("200")
    actual.body jsonMatchesFormat AddedSubscription(newSubscriptionName)
  }
}

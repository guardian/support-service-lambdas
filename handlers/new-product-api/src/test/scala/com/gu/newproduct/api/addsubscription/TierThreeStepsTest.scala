package com.gu.newproduct.api.addsubscription

import com.gu.newproduct.TestData
import com.gu.newproduct.api.addsubscription.email.{GuardianWeeklyEmailData, TierThreeEmailData}
import com.gu.newproduct.api.addsubscription.validation._
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{
  SubscriptionName,
  ZuoraCreateSubRequest,
  ZuoraCreateSubRequestRatePlan,
}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{BillToAddress, SoldToAddress}
import com.gu.newproduct.api.productcatalog.PlanId.TierThreeDomesticMonthly
import com.gu.newproduct.api.productcatalog.RuleFixtures.testStartDateRules
import com.gu.newproduct.api.productcatalog.ZuoraIds.{PlanAndCharge, ProductRatePlanChargeId, ProductRatePlanId}
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

class TierThreeStepsTest extends AnyFlatSpec with Matchers {
  val monthlyTestRatePlanZuoraId = ProductRatePlanId("monthly-zuora-rate-plan-id")
  val monthlyTestRatePlanChargeZuoraId = ProductRatePlanChargeId("monthly-zuora-rate-plan-charge-id")

  val newSubscriptionName = "A-Sxxxxxxxx"
  val testFirstPaymentDate = LocalDate.of(2018, 7, 18)
  val testZuoraAccountId = ZuoraAccountId("acccc")
  val monthlyRatePlan =
    Plan(TierThreeDomesticMonthly, PlanDescription("Tier Three - Monthly - Domestic"), testStartDateRules)
  val discountRatePlanId = "tier_three_discount_rate_plan_id"
  val testCaseId = CaseId("case")
  val testAcquistionSource = AcquisitionSource("CSR")
  val testCSR = CreatedByCSR("bob")

  def stubGetVoucherCustomerData(zuoraAccountId: ZuoraAccountId) = {
    zuoraAccountId should equal(testZuoraAccountId)
    ContinueProcessing(TestData.tierThreeCustomerData)
  }

  def stubValidateAddress(billingAddress: BillToAddress, deliveryAddress: SoldToAddress) = {
    billingAddress should equal(TestData.tierThreeCustomerData.contacts.billTo.address)
    deliveryAddress should equal(TestData.tierThreeCustomerData.contacts.soldTo.address)
    Passed(())
  }

  def stubGetZuoraId(planId: PlanId) = {
    planId match {
      case TierThreeDomesticMonthly => Some(monthlyTestRatePlanZuoraId)
      case _ => fail()
    }
  }

  def stubGetPlanAndCharge(planId: PlanId): Option[PlanAndCharge] = {
    planId match {
      case TierThreeDomesticMonthly =>
        Some(PlanAndCharge(monthlyTestRatePlanZuoraId, monthlyTestRatePlanChargeZuoraId))
      case _ => fail()
    }
  }

  def stubValidateStartDate(expectedPlanId: PlanId)(planId: PlanId, startDate: LocalDate) = {
    planId should equal(expectedPlanId)
    startDate should equal(testFirstPaymentDate)
    Passed(())
  }

  def stubSendEmail(expectedPlan: Plan)(sfContactId: Option[SfContactId], paperData: TierThreeEmailData) = {
    sfContactId should equal(TestData.tierThreeCustomerData.account.sfContactId)
    paperData.subscriptionName should equal(SubscriptionName(newSubscriptionName))
    paperData.contacts should equal(TestData.tierThreeCustomerData.contacts)
    paperData.currency should equal(TestData.tierThreeCustomerData.account.currency)
    paperData.firstPaymentDate should equal(testFirstPaymentDate)
    paperData.paymentMethod should equal(TestData.tierThreeCustomerData.paymentMethod)
    paperData.plan should equal(expectedPlan)
    ContinueProcessing(()).toAsync
  }

  def stubGetPlan(planId: PlanId) = {
    planId match {
      case TierThreeDomesticMonthly => monthlyRatePlan
      case _ => fail()
    }
  }

  val dummySteps = new AddSpecificProduct {
    override def addProduct(request: AddSubscriptionRequest): AsyncApiGatewayOp[SubscriptionName] =
      fail("unexpected execution of voucher steps while processing contribution request!")
  }

  it should "create a Tier Three subscription" in {
    def stubCreate(
        request: CreateSubscription.ZuoraCreateSubRequest,
    ): Types.ClientFailableOp[CreateSubscription.SubscriptionName] = {
      request shouldBe ZuoraCreateSubRequest(
        accountId = testZuoraAccountId,
        acceptanceDate = testFirstPaymentDate,
        acquisitionCase = testCaseId,
        acquisitionSource = testAcquistionSource,
        createdByCSR = testCSR,
        deliveryAgent = None,
        ratePlans = List(
          ZuoraCreateSubRequestRatePlan(
            productRatePlanId = ProductRatePlanId(discountRatePlanId),
            maybeChargeOverride = None,
          ),
          ZuoraCreateSubRequestRatePlan(
            productRatePlanId = monthlyTestRatePlanZuoraId,
            maybeChargeOverride = None,
          ),
        ),
      )
      ClientSuccess(SubscriptionName(newSubscriptionName))
    }

    val stubAddTierThreeSteps = new AddTierThree(
      stubGetPlan,
      stubGetZuoraId,
      stubGetVoucherCustomerData,
      stubValidateStartDate(TierThreeDomesticMonthly),
      stubValidateAddress,
      stubCreate,
      stubSendEmail(monthlyRatePlan),
    )

    val futureActual = new handleRequest(
      addSupporterPlus = dummySteps,
      addContribution = dummySteps,
      addPaperSub = dummySteps,
      addDigipackSub = dummySteps,
      addGuardianWeeklyDomesticSub = dummySteps,
      addGuardianWeeklyROWSub = dummySteps,
      addTierThree = stubAddTierThreeSteps,
    )(
      ApiGatewayRequest(
        None,
        None,
        Some(
          Json.stringify(
            JsObject(
              Map(
                "acquisitionCase" -> JsString(testCaseId.value),
                "startDate" -> JsString(testFirstPaymentDate.toString),
                "zuoraAccountId" -> JsString(testZuoraAccountId.value),
                "acquisitionSource" -> JsString(testAcquistionSource.value),
                "createdByCSR" -> JsString(testCSR.value),
                "planId" -> JsString(TierThreeDomesticMonthly.name),
                "discountRatePlanId" -> JsString(discountRatePlanId),
              ),
            ),
          ),
        ),
        None,
        None,
        None,
      ),
    )

    implicit val format: OFormat[AddedSubscription] = Json.format[AddedSubscription]
    val actual = Await.result(futureActual, 30 seconds)
    actual.statusCode should be("200")
    actual.body jsonMatchesFormat AddedSubscription(newSubscriptionName)
  }
}

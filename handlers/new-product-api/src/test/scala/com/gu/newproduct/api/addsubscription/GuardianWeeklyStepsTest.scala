package com.gu.newproduct.api.addsubscription

import java.time.LocalDate

import com.gu.newproduct.TestData
import com.gu.newproduct.api.addsubscription.email.GuardianWeeklyEmailData
import com.gu.newproduct.api.addsubscription.validation._
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{SubscriptionName, ZuoraCreateSubRequest}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.{BillToAddress, SoldToAddress}
import com.gu.newproduct.api.productcatalog.PlanId.{GuardianWeeklyDomesticQuarterly, VoucherEveryDay}
import com.gu.newproduct.api.productcatalog.ZuoraIds.ProductRatePlanId
import com.gu.newproduct.api.productcatalog.{Plan, PlanDescription, PlanId}
import com.gu.test.JsonMatchers.JsonMatcher
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.reader.AsyncTypes._
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.resthttp.Types
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json._

import scala.concurrent.Await
import scala.concurrent.duration._
import scala.language.postfixOps

class GuardianWeeklyStepsTest extends FlatSpec with Matchers {

  it should "run end to end with stubs" in {
    val testRatePlanId = ProductRatePlanId("ratePlanId")
    val newSubscriptionName = "A-Sxxxxxxxx"
    val testFirstPaymentDate = LocalDate.of(2018, 7, 18)
    val testPlanId = GuardianWeeklyDomesticQuarterly
    val testZuoraAccountId = ZuoraAccountId("acccc")
    val testRatePlan = Plan(testPlanId, PlanDescription("GW Oct 18 - Quarterly - Domestic"))

    def stubGetVoucherCustomerData(zuoraAccountId: ZuoraAccountId) = {
      zuoraAccountId should equal(testZuoraAccountId)
      ContinueProcessing(TestData.guardianWeeklyCustomerData)
    }

    def stubCreate(request: CreateSubscription.ZuoraCreateSubRequest): Types.ClientFailableOp[CreateSubscription.SubscriptionName] = {
      request shouldBe ZuoraCreateSubRequest(
        testRatePlanId,
        testZuoraAccountId,
        None,
        testFirstPaymentDate,
        CaseId("case"),
        AcquisitionSource("CSR"),
        CreatedByCSR("bob")
      )
      ClientSuccess(SubscriptionName(newSubscriptionName))
    }

    val stubGetZuoraId = (planId: PlanId) => {
      planId shouldBe testPlanId
      Some(testRatePlanId)
    }

    def stubValidateStartDate(planId: PlanId, startDate: LocalDate) = {
      planId should equal(testPlanId)
      startDate should equal(testFirstPaymentDate)
      Passed(())
    }

    def stubValidateAddress(billingAddress: BillToAddress, deliveryAddress: SoldToAddress) = {
      billingAddress should equal(TestData.guardianWeeklyCustomerData.contacts.billTo.address)
      deliveryAddress should equal(TestData.guardianWeeklyCustomerData.contacts.soldTo.address)
      Passed(())
    }

    def stubSendEmail(sfContactId: Option[SfContactId], paperData: GuardianWeeklyEmailData) = {
      sfContactId should equal(Some(SfContactId("sfContactId")))
      paperData.subscriptionName should equal(SubscriptionName(newSubscriptionName))
      paperData.contacts should equal(TestData.guardianWeeklyCustomerData.contacts)
      paperData.currency should equal(TestData.guardianWeeklyCustomerData.account.currency)
      paperData.firstPaymentDate should equal(testFirstPaymentDate)
      paperData.paymentMethod should equal(TestData.guardianWeeklyCustomerData.paymentMethod)
      paperData.plan should equal(testRatePlan)
      ContinueProcessing(()).toAsync
    }

    def stubGetPlan(planId: PlanId) = {
      planId should equal(testPlanId)
      testRatePlan
    }

    val stubAddVoucherSteps = AddGuardianWeeklySub.steps(
      stubGetPlan,
      stubGetZuoraId,
      stubGetVoucherCustomerData,
      stubValidateStartDate,
      stubValidateAddress,
      stubCreate,
      stubSendEmail
    ) _

    val dummySteps = (req: AddSubscriptionRequest) => {
      fail("unexpected execution of contribution steps while processing voucher request!")
    }

    val futureActual = Steps.handleRequest(
      addContribution = dummySteps,
      addPaperSub = dummySteps,
      addDigipackSub = dummySteps,
      addGuardianWeeklyDomesticSub = stubAddVoucherSteps,
      addGuardianWeeklyROWSub = stubAddVoucherSteps
    )(ApiGatewayRequest(None, None, Some(Json.stringify(JsObject(
      Map(
        "acquisitionCase" -> JsString("case"),
        "startDate" -> JsString("2018-07-18"),
        "zuoraAccountId" -> JsString(testZuoraAccountId.value),
        "acquisitionSource" -> JsString("CSR"),
        "createdByCSR" -> JsString("bob"),
        "planId" -> JsString("guardian_weekly_domestic_quarterly")
      )
    ))), None, None, None))

    implicit val format: OFormat[AddedSubscription] = Json.format[AddedSubscription]
    val actual = Await.result(futureActual, 30 seconds)
    actual.statusCode should be("200")
    actual.body jsonMatchesFormat AddedSubscription(newSubscriptionName)
  }

}

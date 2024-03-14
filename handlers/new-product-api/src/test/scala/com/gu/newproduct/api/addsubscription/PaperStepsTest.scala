package com.gu.newproduct.api.addsubscription

import com.gu.newproduct.TestData
import com.gu.newproduct.api.addsubscription.email.{DeliveryAgentDetails, PaperEmailData}
import com.gu.newproduct.api.addsubscription.validation._
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{SubscriptionName, ZuoraCreateSubRequest, ZuoraCreateSubRequestRatePlan}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.addsubscription.zuora.GetContacts.SoldToAddress
import com.gu.newproduct.api.productcatalog.PlanId.{NationalDeliveryWeekend, VoucherEveryDay}
import com.gu.newproduct.api.productcatalog.RuleFixtures.testStartDateRules
import com.gu.newproduct.api.productcatalog.ZuoraIds.ProductRatePlanId
import com.gu.newproduct.api.productcatalog.{Plan, PlanDescription, PlanId}
import com.gu.paperround.client.GetAgents
import com.gu.paperround.client.GetAgents.DeliveryAgentRecord
import com.gu.test.JsonMatchers.JsonMatcher
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.reader.AsyncTypes._
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.resthttp.Types
import com.gu.util.resthttp.Types.ClientSuccess
import com.softwaremill.diffx.generic.auto._
import com.softwaremill.diffx.scalatest.DiffShouldMatcher
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import org.scalatest.{Assertion, Inside}
import play.api.libs.json._

import java.time.LocalDate
import scala.concurrent.Await
import scala.concurrent.duration._
import scala.language.postfixOps

class PaperStepsTest extends AnyFlatSpec with Matchers with Inside with DiffShouldMatcher {

  case class ExpectedOut(subscriptionNumber: String)

  private val exampleDeliveryAgent: DeliveryAgent = DeliveryAgent("helloAgent")

  it should "run end to end with fakes" in {

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

    val fakeAddVoucherSteps = buildAddPaperSteps(VoucherEveryDay, None, _ => succeed)

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

  it should "run paper steps with a delivery agent" in {

    val addVoucherSteps: AddPaperSub = buildAddPaperSteps(
      NationalDeliveryWeekend,
      Some(exampleDeliveryAgent),
      { paperEmailData =>
        val expectedDeliveryAgentDetails = DeliveryAgentDetails("agentName1", "telephone1", "email1", "address11", "address21", "town1", "county1", "postcode1")
        paperEmailData.deliveryAgentDetails shouldMatchTo Some(expectedDeliveryAgentDetails)
      }
    )

    val requestInput = AddSubscriptionRequest(
      zuoraAccountId = ZuoraAccountId("acccc"),
      startDate = LocalDate.of(2018, 7, 18),
      acquisitionSource = AcquisitionSource("CSR"),
      deliveryAgent = Some(exampleDeliveryAgent),
      createdByCSR = CreatedByCSR("bob"),
      amountMinorUnits = None,
      acquisitionCase = CaseId("case"),
      planId = NationalDeliveryWeekend,
      discountRatePlanId= None,
    )

    val futureActual = addVoucherSteps.addProduct(requestInput)

    val actual = Await.result(futureActual.underlying, 30 seconds)
    inside(actual) {
      case ContinueProcessing(SubscriptionName("well done")) =>
    }

  }

  private def buildAddPaperSteps(
    expectedPlanId: PlanId,
    expectedDeliveryAgent: Option[DeliveryAgent],
    checkPaperEmailData: PaperEmailData => Assertion
  ): AddPaperSub = {

    val ratePlanId = ProductRatePlanId("ratePlanId")

    def fakeGetVoucherCustomerData(zuoraAccountId: ZuoraAccountId) = ContinueProcessing(TestData.voucherCustomerData)

    val expectedIn = ZuoraCreateSubRequest(
      accountId = ZuoraAccountId("acccc"),
      acceptanceDate = LocalDate.of(2018, 7, 18),
      acquisitionCase = CaseId("case"),
      acquisitionSource = AcquisitionSource("CSR"),
      createdByCSR = CreatedByCSR("bob"),
      deliveryAgent = expectedDeliveryAgent,
      ratePlans = List(
        ZuoraCreateSubRequestRatePlan(
          productRatePlanId = ratePlanId,
          maybeChargeOverride = None,
        ),
      ),
    )

    def fakeCreate(
      in: ZuoraCreateSubRequest,
    ): Types.ClientFailableOp[SubscriptionName] = {
      in shouldMatchTo expectedIn
      ClientSuccess(SubscriptionName("well done"))
    }

    def fakeGetAgents = new GetAgents {
      override def getAgents(): Types.ClientFailableOp[List[GetAgents.DeliveryAgentRecord]] =
        ClientSuccess(List(
          DeliveryAgentRecord(
            DeliveryAgent("differentAgentHere"),
            "agentName2",
            "telephone2",
            "town2",
            "postcode2",
            "address22",
            "email2",
            "address12",
            "county2",
          ),
          DeliveryAgentRecord(
            exampleDeliveryAgent,
            "agentName1",
            "telephone1",
            "town1",
            "postcode1",
            "address21",
            "email1",
            "address11",
            "county1",
          ),
          DeliveryAgentRecord(
            DeliveryAgent("anotherDifferentAgentHere"),
            "agentName3",
            "telephone3",
            "town3",
            "postcode3",
            "address23",
            "email3",
            "address13",
            "county3",
          ),
        ))
    }

    val fakeGetZuoraId = (planId: PlanId) => {
      planId shouldMatchTo expectedPlanId
      Some(ratePlanId)
    }

    def fakeValidateStartDate(id: PlanId, d: LocalDate) = Passed(())

    def fakeValidateAddress(id: PlanId, a: SoldToAddress) = Passed(())

    def fakeSendEmail(sfContactId: Option[SfContactId], paperData: PaperEmailData) = {
      checkPaperEmailData(paperData)
      ContinueProcessing(()).toAsync
    }

    def fakeGetPlan(planId: PlanId) = Plan(VoucherEveryDay, PlanDescription("Everyday"), testStartDateRules)

    new AddPaperSub(
      fakeGetPlan,
      fakeGetZuoraId,
      fakeGetVoucherCustomerData,
      fakeValidateStartDate,
      fakeValidateAddress,
      fakeCreate,
      fakeSendEmail,
      fakeGetAgents,
    )
  }
}

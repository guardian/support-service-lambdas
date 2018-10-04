package com.gu.newproduct.api.addsubscription

import java.time.LocalDate

import com.gu.i18n.Currency
import com.gu.newproduct.TestData
import com.gu.newproduct.api.addsubscription.email.contributions.SendConfirmationEmailContributions.ContributionsEmailData
import com.gu.newproduct.api.addsubscription.validation.contribution.ContributionValidations.ValidatableFields
import com.gu.newproduct.api.addsubscription.validation.{Failed, Passed}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{ChargeOverride, SubscriptionName, ZuoraCreateSubRequest}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.productcatalog.AmountMinorUnits
import com.gu.newproduct.api.productcatalog.ZuoraIds.{PlanAndCharge, ProductRatePlanChargeId, ProductRatePlanId}
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

class ContributionStepsTest extends FlatSpec with Matchers {

  case class ExpectedOut(subscriptionNumber: String)

  it should "run end to end with fakes" in {

    val planAndCharge = PlanAndCharge(
      ProductRatePlanId("ratePlanId"),
      ProductRatePlanChargeId("ratePlanChargeId")
    )

    val expectedIn = ZuoraCreateSubRequest(
      planAndCharge.productRatePlanId,
      ZuoraAccountId("acccc"),
      Some(ChargeOverride(
        AmountMinorUnits(123),
        planAndCharge.productRatePlanChargeId
      )),
      LocalDate.of(2018, 7, 28),
      CaseId("case"),
      AcquisitionSource("CSR"),
      CreatedByCSR("bob")
    )

    def fakeCreate(in: CreateSubscription.ZuoraCreateSubRequest): Types.ClientFailableOp[CreateSubscription.SubscriptionName] = {
      in shouldBe expectedIn
      ClientSuccess(SubscriptionName("well done"))
    }

    def fakeSendEmails(sfContactId: Option[SfContactId], contributionsEmailData: ContributionsEmailData) = {
      ContinueProcessing(()).toAsync
    }

    def fakeValidateRequest(fields: ValidatableFields, currency: Currency) = {
      fields.amountMinorUnits.map(Passed(_)).getOrElse(Failed("missing amount"))
    }

    def fakeGetCustomerData(zuoraAccountId: ZuoraAccountId) = ContinueProcessing(TestData.contributionCustomerData)

    val requestInput = JsObject(Map(
      "acquisitionCase" -> JsString("case"),
      "amountMinorUnits" -> JsNumber(123),
      "startDate" -> JsString("2018-07-18"),
      "zuoraAccountId" -> JsString("acccc"),
      "acquisitionSource" -> JsString("CSR"),
      "createdByCSR" -> JsString("bob"),
      "planId" -> JsString("monthly_contribution")

    ))

    implicit val format: OFormat[ExpectedOut] = Json.format[ExpectedOut]
    val expectedOutput = ExpectedOut("well done")

    val fakeAddContributionSteps = Steps.addContributionSteps(
      planAndCharge,
      fakeGetCustomerData,
      fakeValidateRequest,
      fakeCreate,
      fakeSendEmails
    ) _

    val dummyVoucherSteps = (req: AddSubscriptionRequest) => {
      fail("unexpected execution of voucher steps while processing contribution request!")
    }
    val futureActual = Steps.handleRequest(
      addContribution = fakeAddContributionSteps,
      addVoucher = dummyVoucherSteps
    )(ApiGatewayRequest(None, Some(Json.stringify(requestInput)), None, None))

    val actual = Await.result(futureActual, 30 seconds)
    actual.statusCode should be("200")
    actual.body jsonMatchesFormat expectedOutput
  }

}

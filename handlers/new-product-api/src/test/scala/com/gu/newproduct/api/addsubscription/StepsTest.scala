package com.gu.newproduct.api.addsubscription

import java.time.LocalDate

import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.email.SendConfirmationEmail.ContributionsEmailData
import com.gu.newproduct.api.addsubscription.validation.ValidatedFields
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{CreateReq, SubscriptionName}
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{BankAccountName, BankAccountNumberMask, DirectDebit, MandateId, NonDirectDebitMethod, SortCode}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.ActivePaymentMethod
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType.CreditCard
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

class StepsTest extends FlatSpec with Matchers {

  case class ExpectedOut(subscriptionNumber: String)

  "it" should "run end to end with fakes" in {

    val expectedIn = CreateReq(
      ZuoraAccountId("acccc"),
      AmountMinorUnits(123),
      LocalDate.of(2018, 7, 18),
      LocalDate.of(2018, 7, 28),
      CaseId("case"),
      AcquisitionSource("CSR"),
      CreatedByCSR("bob")
    )

    def fakeCreate(in: CreateSubscription.CreateReq): Types.ClientFailableOp[CreateSubscription.SubscriptionName] = {
      in shouldBe expectedIn
      ClientSuccess(SubscriptionName("well done"))
    }

    def fakeCheck(request: AddSubscriptionRequest): AsyncApiGatewayOp[ValidatedFields] = {
      request.zuoraAccountId.value shouldBe "acccc"
      val paymentMethod = DirectDebit(
        ActivePaymentMethod,
        BankAccountName("someName"),
        BankAccountNumberMask("123312***"),
        SortCode("233331"),
        MandateId("1234 ")
      )
      val validatedFields = ValidatedFields(paymentMethod, GBP)
      ContinueProcessing((validatedFields)).toAsync
    }

    def fakeSendEmails(contributionsEmailData: ContributionsEmailData) = {
      ContinueProcessing(()).toAsync
    }

    val requestInput = JsObject(Map(
      "acquisitionCase" -> JsString("case"),
      "amountMinorUnits" -> JsNumber(123),
      "startDate" -> JsString("2018-07-18"),
      "zuoraAccountId" -> JsString("acccc"),
      "acquisitionSource" -> JsString("CSR"),
      "createdByCSR" -> JsString("bob")

    ))

    implicit val format: OFormat[ExpectedOut] = Json.format[ExpectedOut]
    val expectedOutput = ExpectedOut("well done")

    val futureActual = Steps.addSubscriptionSteps(
      fakeCheck,
      fakeCreate,
      fakeSendEmails
    )(ApiGatewayRequest(None, Some(Json.stringify(requestInput)), None, None))

    val actual = Await.result(futureActual, 30 seconds)
    actual.statusCode should be("200")
    actual.body jsonMatchesFormat expectedOutput
  }

}

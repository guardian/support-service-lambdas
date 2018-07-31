package com.gu.newproduct.api.addsubscription

import java.time.LocalDate

import com.gu.i18n.Currency
import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.validation.ValidatedFields
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{CreateReq, SubscriptionName}
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{DirectDebit, NonDirectDebitMethod, PaymentMethod}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.ActivePaymentMethod
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType.CreditCard
import com.gu.test.JsonMatchers.JsonMatcher
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.reader.Types.AsyncApiGatewayOp
import com.gu.util.resthttp.Types
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json._

import scala.concurrent.Await
import scala.concurrent.duration._

class StepsTest extends FlatSpec with Matchers {

  case class ExpectedOut(subscriptionNumber: String)
  "it" should "run end to end with fakes" in {

    val expectedIn = CreateReq(
      ZuoraAccountId("acccc"),
      123,
      LocalDate.of(2018, 7, 18),
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
      val paymentMethod = NonDirectDebitMethod(ActivePaymentMethod, CreditCard)
      val validatedFields = ValidatedFields(paymentMethod, GBP)
      AsyncApiGatewayOp(ContinueProcessing((validatedFields)))
    }

    def fakeSendEmails(zuoraAccountId: ZuoraAccountId, currency: Currency, directDebit: Option[DirectDebit], amountMinorUnits: Int) = {
      AsyncApiGatewayOp(ContinueProcessing(()))
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

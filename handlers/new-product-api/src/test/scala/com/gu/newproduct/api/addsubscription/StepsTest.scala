package com.gu.newproduct.api.addsubscription

import java.time.LocalDate

import com.gu.i18n.Currency.GBP
import com.gu.i18n.{Country, Currency}
import com.gu.newproduct.api.addsubscription.email.SendConfirmationEmail.ContributionsEmailData
import com.gu.newproduct.api.addsubscription.validation.ContributionValidations.ValidatableFields
import com.gu.newproduct.api.addsubscription.validation._
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.{SubscriptionName, ZuoraCreateSubRequest}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.{AccountBalanceMinorUnits, AutoPay, IdentityId, PaymentMethodId}
import com.gu.newproduct.api.addsubscription.zuora.GetContacts._
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{BankAccountName, BankAccountNumberMask, DirectDebit, MandateId, SortCode}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.ActivePaymentMethod
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

  it should "run end to end with fakes" in {

    val expectedIn = ZuoraCreateSubRequest(
      ZuoraAccountId("acccc"),
      AmountMinorUnits(123),
      LocalDate.of(2018, 7, 18),
      LocalDate.of(2018, 7, 28),
      CaseId("case"),
      AcquisitionSource("CSR"),
      CreatedByCSR("bob")
    )

    def fakeCreate(in: CreateSubscription.ZuoraCreateSubRequest): Types.ClientFailableOp[CreateSubscription.SubscriptionName] = {
      in shouldBe expectedIn
      ClientSuccess(SubscriptionName("well done"))
    }

    def fakeSendEmails(contributionsEmailData: ContributionsEmailData) = {
      ContinueProcessing(()).toAsync
    }

    def fakeValidateRequest(fields: ValidatableFields, currency: Currency) = {
      fields.amountMinorUnits.map(Passed(_)).getOrElse(Failed("missing amount"))
    }

    val fakeAccount = ValidatedAccount(
      identityId = Some(IdentityId("identityId")),
      paymentMethodId = PaymentMethodId("paymentMethodId"),
      autoPay = AutoPay(true),
      accountBalanceMinorUnits = AccountBalanceMinorUnits(1234),
      currency = GBP
    )
    val fakeContacts = Contacts(
      billTo = BilltoContact(
        firstName = FirstName("firstName"),
        lastName = LastName("lastName"),
        email = Some(Email("email@mail.com")),
        country = Some(Country.UK)
      ),
      soldTo = SoldToContact(
        firstName = FirstName("soldToFirstName"),
        lastName = LastName("soldToLastName"),
        email = Some(Email("soldtoEmail@mail.com")),
        country = Country.US
      )
    )

    val fakeDirectDebit = DirectDebit(
      ActivePaymentMethod,
      BankAccountName("someName"),
      BankAccountNumberMask("123312***"),
      SortCode("233331"),
      MandateId("1234 ")
    )
    def fakeGetCustomerData(zuoraAccountId: ZuoraAccountId) = ContinueProcessing(
      CustomerData(
        account = fakeAccount,
        paymentMethod = fakeDirectDebit,
        accountSubscriptions = Nil,
        contacts = fakeContacts
      )
    )
    def fakeGetVoucherCustomerData(zuoraAccountId: ZuoraAccountId) = ContinueProcessing(
      VoucherCustomerData(
        account = fakeAccount,
        paymentMethod = fakeDirectDebit,
        contacts = fakeContacts
      )
    )

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
      fakeGetCustomerData,
      fakeValidateRequest,
      fakeCreate,
      fakeSendEmails
    ) _

    val fakeAddVoucherSteps = Steps.addVoucherSteps(
      fakeGetVoucherCustomerData
    ) _
    val futureActual = Steps.handleRequest(
      addContribution = fakeAddContributionSteps,
      addVoucher = fakeAddVoucherSteps
    )(ApiGatewayRequest(None, Some(Json.stringify(requestInput)), None, None))

    val actual = Await.result(futureActual, 30 seconds)
    actual.statusCode should be("200")
    actual.body jsonMatchesFormat expectedOutput
  }

}

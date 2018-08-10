package com.gu.newproduct.api.addsubscription.email.contributions

import java.time.LocalDate

import com.gu.i18n.Country
import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.email.contributions.SendConfirmationEmailContributions.ContributionsEmailData
import com.gu.newproduct.api.addsubscription.email.{CContactAttributes, CTo, ETPayload}
import com.gu.newproduct.api.addsubscription.zuora.GetBillToContact._
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{BankAccountName, BankAccountNumberMask, DirectDebit, MandateId, NonDirectDebitMethod, SortCode}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.ActivePaymentMethod
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType.CreditCard
import com.gu.newproduct.api.addsubscription.{AmountMinorUnits, ZuoraAccountId}
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import org.scalatest.{FlatSpec, Matchers}

import scala.concurrent.duration._
import scala.concurrent.{Await, Future}
import scala.language.postfixOps

class SendConfirmationEmailContributionsTest extends FlatSpec with Matchers {

  def today = () => LocalDate.of(2018, 7, 30)

  val testContact = Contact(
    FirstName("Marty"),
    LastName("McFly"),
    email = Some(Email("email@email.com")),
    Some(Country.UK)
  )

  val directDebit = DirectDebit(
    ActivePaymentMethod,
    BankAccountName("test bank account"),
    BankAccountNumberMask("2132138123****"),
    SortCode("123456"),
    MandateId("mandate1234")
  )

  val testData = ContributionsEmailData(
    accountId = ZuoraAccountId("id"),
    currency = GBP,
    paymentMethod = directDebit,
    amountMinorUnits = AmountMinorUnits(1234),
    firstPaymentDate = LocalDate.of(2018, 8, 9)
  )

  it should "send confirmation email" in {

    def getContact(accountId: ZuoraAccountId): ClientFailableOp[Contact] = ClientSuccess(testContact)

    def sqsSend(payload: ETPayload[ContributionFields]): Future[Unit] = {

      val expectedContactAttributes = CContactAttributes[ContributionFields](
        SubscriberAttributes = ContributionFields(
          EmailAddress = "email@email.com",
          created = "2018-07-30",
          amount = "12.34",
          currency = "£",
          edition = "GB",
          name = "Marty",
          product = "monthly-contribution",
          `account name` = Some("test bank account"),
          `account number` = Some("2132138123****"),
          `sort code` = Some("12-34-56"),
          `Mandate ID` = Some("mandate1234"),
          `first payment date` = Some("Thursday, 9 August 2018"),
          `payment method` = Some("Direct Debit")
        )
      )
      val expectedPayload = ETPayload[ContributionFields](
        To = CTo[ContributionFields](
          Address = "email@email.com",
          SubscriberKey = "email@email.com",
          ContactAttributes = expectedContactAttributes
        ),
        DataExtensionName = "regular-contribution-thank-you"
      )

      payload shouldBe expectedPayload
      Future.successful(())
    }

    val send = SendConfirmationEmailContributions(sqsSend, today, getContact) _

    val res = Await.result(send(testData).underlying, 3 seconds)

    res.shouldBe(ContinueProcessing(()))

  }

  it should "return success but not send message if getContacts fails" in {

    def getContact(accountId: ZuoraAccountId): ClientFailableOp[Contact] = GenericError("could not retrieve contacts")

    //todo this check that it is not called does not work
    def sqsSend(ETPayload: ETPayload[ContributionFields]): Future[Unit] = fail("unexpected invocation of sqsSend")
    val send = SendConfirmationEmailContributions(sqsSend, today, getContact) _

    val res = Await.result(send(testData).underlying, 3 seconds)

    res.shouldBe(ContinueProcessing(()))

  }

  it should "return success but not send message if contact has no email" in {

    def getContact(accountId: ZuoraAccountId): ClientFailableOp[Contact] = ClientSuccess(testContact.copy(email = None))

    //todo this check that it is not called does not work
    def sqsSend(ETPayload: ETPayload[ContributionFields]): Future[Unit] = fail("unexpected invocation of sqsSend")

    val send = SendConfirmationEmailContributions(sqsSend, today, getContact) _

    val res = Await.result(send(testData).underlying, 3 seconds)

    res.shouldBe(ContinueProcessing(()))

  }

  it should "return success if sqs send fails" in {

    def getContact(accountId: ZuoraAccountId): ClientFailableOp[Contact] = ClientSuccess(testContact)

    def sqsSend(payload: ETPayload[ContributionFields]): Future[Unit] = Future.failed(new RuntimeException("sqs error`"))

    val send = SendConfirmationEmailContributions(sqsSend, today, getContact) _

    val res = Await.result(send(testData).underlying, 3 seconds)

    res.shouldBe(ContinueProcessing(()))
  }

  it should "convert to contributions fields from data without direct debit" in {

    val billTo = Contact(FirstName("Marty"), LastName("McFly"), Some(Email("some@email.com")), Some(Country.UK))

    val expectedContributionFields = ContributionFields(
      EmailAddress = "some@email.com",
      created = "2018-07-12",
      amount = "12.34",
      currency = "£",
      edition = "GB",
      name = "Marty",
      product = "monthly-contribution",
      `account name` = None,
      `account number` = None,
      `sort code` = None,
      `Mandate ID` = None,
      `first payment date` = None,
      `payment method` = None

    )

    val noDirectDebitData = testData.copy(paymentMethod = NonDirectDebitMethod(ActivePaymentMethod, CreditCard))

    val actual = SendConfirmationEmailContributions.toContributionFields(LocalDate.of(2018, 7, 12), billTo, noDirectDebitData)
    actual shouldBe Some(expectedContributionFields)

  }

  it should "convert to contribution fields from data with direct debit" in {

    val billTo = Contact(FirstName("Marty"), LastName("McFly"), Some(Email("some@email.com")), Some(Country.UK))

    val expectedContributionFields = ContributionFields(
      EmailAddress = "some@email.com",
      created = "2018-07-12",
      amount = "12.34",
      currency = "£",
      edition = "GB",
      name = "Marty",
      product = "monthly-contribution",
      `account name` = Some("test bank account"),
      `account number` = Some("2132138123****"),
      `sort code` = Some("12-34-56"),
      `Mandate ID` = Some("mandate1234"),
      `first payment date` = Some("Thursday, 9 August 2018"),
      `payment method` = Some("Direct Debit")

    )

    val actual = SendConfirmationEmailContributions.toContributionFields(LocalDate.of(2018, 7, 12), billTo, testData)
    actual shouldBe Some(expectedContributionFields)

  }
}

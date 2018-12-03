package com.gu.newproduct.api.addsubscription.email.contributions

import java.time.LocalDate

import com.gu.i18n.Country
import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.email.contributions.SendConfirmationEmailContributions.ContributionsEmailData
import com.gu.newproduct.api.addsubscription.email.{CContactAttributes, CTo, ETPayload}
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.addsubscription.zuora.GetContacts._
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{BankAccountName, BankAccountNumberMask, DirectDebit, MandateId, NonDirectDebitMethod, SortCode}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.ActivePaymentMethod
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodType.CreditCard
import com.gu.newproduct.api.productcatalog.PlanId.{AnnualContribution, MonthlyContribution}
import com.gu.newproduct.api.productcatalog.{AmountMinorUnits, PlanId}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import org.scalatest.{AsyncFlatSpec, Matchers}

import scala.concurrent.Future

class SendConfirmationEmailContributionsTest extends AsyncFlatSpec with Matchers {

  def today = () => LocalDate.of(2018, 7, 30)

  val testContact = BillToContact(
    title = None,
    firstName = FirstName("Marty"),
    lastName = LastName("McFly"),
    email = Some(Email("email@email.com")),
    address = BillToAddress(
      address1 = None,
      address2 = None,
      city = None,
      state = None,
      country = Some(Country.UK),
      postcode = None
    )
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
    firstPaymentDate = LocalDate.of(2018, 8, 9),
    billTo = testContact,
    planId = MonthlyContribution
  )

  val sfContactId = Some(SfContactId("sfContactId"))

  it should "send confirmation email" in {

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
        DataExtensionName = "regular-contribution-thank-you",
        SfContactId = Some("sfContactId")
      )

      payload shouldBe expectedPayload
      Future.successful(())
    }

    val send = SendConfirmationEmailContributions(sqsSend, today) _

    send(sfContactId, testData).underlying map {
      res => res shouldBe ContinueProcessing(())
    }

  }

  it should "return error and not attempt to send email if contact has no email" in {

    def sqsSend(ETPayload: ETPayload[ContributionFields]): Future[Unit] = fail("unexpected invocation of sqsSend")

    val send = SendConfirmationEmailContributions(sqsSend, today) _

    send(sfContactId, testData).underlying map {
      res => res shouldBe ReturnWithResponse(ApiGatewayResponse.internalServerError("some log message"))
    }
  }

  it should "return error if sqs send fails" in {

    def sqsSend(payload: ETPayload[ContributionFields]): Future[Unit] = Future.failed(new RuntimeException("sqs error`"))

    val send = SendConfirmationEmailContributions(sqsSend, today) _

    send(sfContactId, testData).underlying map {
      res => res shouldBe ReturnWithResponse(ApiGatewayResponse.internalServerError("some log message"))
    }
  }

  it should "convert to contributions fields from data without direct debit" in {

    val expectedContributionFields = ContributionFields(
      EmailAddress = "email@email.com",
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

    val actual = SendConfirmationEmailContributions.toContributionFields(LocalDate.of(2018, 7, 12), noDirectDebitData)
    actual shouldBe Some(expectedContributionFields)

  }

  it should "convert to contribution fields from data with direct debit" in {

    val expectedContributionFields = ContributionFields(
      EmailAddress = "email@email.com",
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

    val actual = SendConfirmationEmailContributions.toContributionFields(LocalDate.of(2018, 7, 12), testData)
    actual shouldBe Some(expectedContributionFields)

  }
}

package com.gu.newproduct.api.addsubscription.email

import java.time.LocalDate

import com.gu.effects.sqs.AwsSQSSend.Payload
import com.gu.i18n.Country
import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.{AmountMinorUnits, ZuoraAccountId}
import com.gu.newproduct.api.addsubscription.zuora.GetBillToContact._
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{BankAccountName, BankAccountNumberMask, DirectDebit, MandateId, SortCode}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.ActivePaymentMethod
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json

import scala.concurrent.duration._
import scala.concurrent.{Await, Future}
import scala.language.postfixOps

class SendConfirmationEmailTest extends FlatSpec with Matchers {

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

  it should "send confirmation email" in {

    def getContact(accountId: ZuoraAccountId): ClientFailableOp[Contact] = ClientSuccess(testContact)

    def sqsSend(payload: Payload): Future[Unit] = {
      val expectedString =
        """{
          |  "To": {
          |    "Address": "email@email.com",
          |    "SubscriberKey": "email@email.com",
          |    "ContactAttributes": {
          |      "SubscriberAttributes": {
          |        "EmailAddress": "email@email.com",
          |        "created": "2018-07-30",
          |        "amount": "12.34",
          |        "currency": "£",
          |        "edition": "GB",
          |        "name": "Marty McFly",
          |        "product": "monthly-contribution",
          |        "account name": "test bank account",
          |        "account number": "2132138123****",
          |        "sort code": "12-34-56",
          |        "Mandate ID": "mandate1234",
          |        "first payment date": "Thursday, 9 August 2018",
          |        "payment method": "Direct Debit"
          |      }
          |    }
          |  },
          |  "DataExtensionName": "regular-contribution-thank-you"
          |}""".stripMargin

      Json.parse(payload.value) shouldBe Json.parse(expectedString)
      Future.successful(())
    }

    val send = SendConfirmationEmail(today, sqsSend, getContact) _

    val res = Await.result(send(ZuoraAccountId("id"), GBP, Some(directDebit), AmountMinorUnits(1234)).underlying, 3 seconds)

    res.shouldBe(ContinueProcessing(()))

  }

  it should "return success but not send message if getContacts fails" in {

    def getContact(accountId: ZuoraAccountId): ClientFailableOp[Contact] = GenericError("could not retrieve contacts")

    def sqsSend(payload: Payload): Future[Unit] = fail("unexpected invocation of sqsSend")

    val send = SendConfirmationEmail(today, sqsSend, getContact) _

    val res = Await.result(send(ZuoraAccountId("id"), GBP, Some(directDebit), AmountMinorUnits(1234)).underlying, 3 seconds)

    res.shouldBe(ContinueProcessing(()))

  }

  it should "return success but not send message if contact has no email" in {

    def getContact(accountId: ZuoraAccountId): ClientFailableOp[Contact] = ClientSuccess(testContact.copy(email = None))

    def sqsSend(payload: Payload): Future[Unit] = fail("unexpected invocation of sqsSend")

    val send = SendConfirmationEmail(today, sqsSend, getContact) _

    val res = Await.result(send(ZuoraAccountId("id"), GBP, Some(directDebit), AmountMinorUnits(1234)).underlying, 3 seconds)

    res.shouldBe(ContinueProcessing(()))

  }

  it should "return success if sqs send fails" in {

    def getContact(accountId: ZuoraAccountId): ClientFailableOp[Contact] = ClientSuccess(testContact)

    def sqsSend(payload: Payload): Future[Unit] = Future.failed(new RuntimeException("sqs error`"))

    val send = SendConfirmationEmail(today, sqsSend, getContact) _

    val res = Await.result(send(ZuoraAccountId("id"), GBP, Some(directDebit), AmountMinorUnits(1234)).underlying, 3 seconds)

    res.shouldBe(ContinueProcessing(()))
  }
}

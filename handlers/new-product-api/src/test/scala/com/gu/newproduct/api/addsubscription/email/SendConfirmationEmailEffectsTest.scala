package com.gu.newproduct.api.addsubscription.email

import com.gu.effects.RawEffects
import com.gu.effects.sqs.AwsSQSSend
import com.gu.effects.sqs.AwsSQSSend.QueueName
import com.gu.i18n.Country
import com.gu.i18n.Currency.GBP
import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.addsubscription.zuora.GetContacts._
import com.gu.newproduct.api.addsubscription.zuora.GetPaymentMethod.{BankAccountName, BankAccountNumberMask, DirectDebit, MandateId, SortCode}
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus
import com.gu.newproduct.api.addsubscription.zuora.PaymentMethodStatus.ActivePaymentMethod
import com.gu.test.EffectsTest
import com.gu.util.config.Stage
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import org.scalatest.{FlatSpec, Matchers}

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.{Await, Future}
import scala.concurrent.duration._

class SendConfirmationEmailEffectsTest extends FlatSpec with Matchers {

  it should "do stuff" taggedAs EffectsTest in {
    def getContacts(accountId: ZuoraAccountId): ClientFailableOp[Contacts] = {
      val contact = Contact(
        FirstName("Marty"),
        LastName("McFly"),
        Some(Email("patricio.vighi+12879638271123@guardian.co.uk")),
        Some(Country.UK)
      )

      ClientSuccess(Contacts(contact, contact))
    }
    def sqsSend = AwsSQSSend(QueueName("contributions-thanks-dev")) _
    def today = () => RawEffects.now().toLocalDate
    val send = SendConfirmationEmail(today, sqsSend, getContacts) _

    val directDebit = DirectDebit(
      ActivePaymentMethod,
      BankAccountName("test bank account"),
      BankAccountNumberMask("2132138123****"),
      SortCode("123456"),
      MandateId("mandate1234")
    )
    val res = Await.result(send(ZuoraAccountId("id"), GBP, Some(directDebit), 1234).underlying, 3 seconds)

    res.shouldBe(ContinueProcessing(()))

  }
}

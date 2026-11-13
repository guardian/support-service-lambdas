package com.gu.autoCancel

import com.gu.util.email.{EmailMessage, EmailSender, InvoiceId}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import com.gu.util.zuora.GetInvoiceTransactions
import com.gu.util.zuora.ZuoraGetInvoiceTransactions.{InvoiceItem, InvoiceTransactionSummary, ItemisedInvoice}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import java.time.LocalDate
import scala.collection.mutable.ListBuffer

class ZuoraEmailStepsTest extends AnyFlatSpec with Matchers {
  private val callout =
    AutoCancelInputFilterTest.fakeCallout(true).copy(accountId = "account-1", invoiceId = "unpaid-1")
  private val item = InvoiceItem(
    "item-1",
    "A-S001",
    LocalDate.of(2026, 9, 15),
    LocalDate.of(2026, 10, 14),
    20,
    "charge",
    "Supporter Plus",
    0,
  )
  private val invoice = ItemisedInvoice("unpaid-1", LocalDate.of(2026, 9, 15), 20, 0, "Posted", List(item))

  private class Services extends GetInvoiceTransactions with EmailSender {
    val calls = ListBuffer.empty[String]
    val messages = ListBuffer.empty[EmailMessage]
    var invoiceResult: ClientFailableOp[InvoiceTransactionSummary] = ClientSuccess(
      InvoiceTransactionSummary(List(invoice)),
    )
    var emailResult: ClientFailableOp[Unit] = ClientSuccess(())

    override def getInvoiceTransactions(accountId: String): ClientFailableOp[InvoiceTransactionSummary] = {
      accountId shouldBe callout.accountId
      calls += "transactions"
      invoiceResult
    }

    override def send(message: EmailMessage): ClientFailableOp[Unit] = {
      calls += "send"
      messages += message
      emailResult
    }

    val steps = new ZuoraEmailSteps(this, this)
  }

  "ZuoraEmailSteps" should "read invoice data before creating and sending the cancellation email" in {
    val services = new Services

    services.steps.sendCancellationEmail(callout) shouldBe ClientSuccess(())

    services.calls.toList shouldBe List("transactions", "send")
    services.messages should have size 1
    val message = services.messages.head
    message.To.Address shouldBe callout.email.get
    message.SfContactId shouldBe callout.sfContactId
    message.DataExtensionName shouldBe "cancelled-payment-email"
    val attributes = message.To.ContactAttributes.SubscriberAttributes
    attributes.subscriber_id shouldBe item.subscriptionName
    attributes.product shouldBe item.productName
    attributes.primaryKey shouldBe InvoiceId(callout.invoiceId)
    attributes.serviceStartDate shouldBe "15 September 2026"
    attributes.serviceEndDate shouldBe "14 October 2026"
  }

  it should "propagate an invoice read failure without attempting to send an email" in {
    val services = new Services
    val failure = GenericError("Invoice lookup failed")
    services.invoiceResult = failure

    services.steps.sendCancellationEmail(callout) shouldBe failure

    services.calls.toList shouldBe List("transactions")
    services.messages shouldBe empty
  }

  List(
    "no positive posted invoice" -> Nil,
    "no positive charge items" -> List(invoice.copy(invoiceItems = List(item.copy(chargeAmount = 0)))),
  ).foreach { case (description, invoices) =>
    it should s"not send an email when the account has $description" in {
      val services = new Services
      services.invoiceResult = ClientSuccess(InvoiceTransactionSummary(invoices))

      services.steps.sendCancellationEmail(callout) shouldBe
        GenericError(s"Could not retrieve additional data for account ${callout.accountId}")

      services.calls.toList shouldBe List("transactions")
      services.messages shouldBe empty
    }
  }

  it should "not send an email when the callout has no email address" in {
    val services = new Services

    services.steps.sendCancellationEmail(callout.copy(email = None)).isFailure shouldBe true

    services.calls.toList shouldBe List("transactions")
    services.messages shouldBe empty
  }

  it should "surface a send failure with account context and without retrying" in {
    val services = new Services
    services.emailResult = GenericError("Queue unavailable")

    services.steps.sendCancellationEmail(callout) shouldBe
      GenericError(s"email not sent for account ${callout.accountId}, error: Queue unavailable")

    services.calls.toList shouldBe List("transactions", "send")
    services.messages should have size 1
  }
}

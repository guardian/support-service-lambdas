package com.gu.autoCancel

import com.gu.autoCancel.AutoCancel.{AutoCancelRequest, CancellationResponse}
import com.gu.util.apigateway.ApiGatewayResponse.internalServerError
import com.gu.util.email.{EmailMessage, EmailSender, InvoiceId}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, ClientSuccess, GenericError}
import com.gu.util.zuora._
import com.gu.util.zuora.ZuoraGetAccountSummary.{
  AccountSummary,
  BasicAccountInfo,
  Invoice,
  SubscriptionSummary,
  SubscriptionId,
}
import com.gu.util.zuora.ZuoraGetAccountSummary.ZuoraAccount.{AccountId, PaymentMethodId}
import com.gu.util.zuora.ZuoraGetInvoiceTransactions.{InvoiceItem, InvoiceTransactionSummary, ItemisedInvoice}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import java.time.LocalDate
import scala.collection.mutable.ListBuffer

class AutoCancelBehaviourTest extends AnyFlatSpec with Matchers {
  private val orderDate = LocalDate.of(2026, 10, 20)
  private val cancellationDate = LocalDate.of(2026, 9, 15)
  private val request = AutoCancelRequest("account-1", SubscriptionNumber("A-S001"), cancellationDate)
  private val secondRequest = request.copy(subToCancel = SubscriptionNumber("A-S002"))
  private val failure = GenericError("Service unavailable")
  private val callout = AutoCancelInputFilterTest
    .fakeCallout(true)
    .copy(
      accountId = request.accountId,
      invoiceId = "unpaid-1",
    )

  private def item(subscription: String, charge: Double, tax: Double = 0): InvoiceItem =
    InvoiceItem(
      "item",
      subscription,
      cancellationDate,
      cancellationDate.plusMonths(1),
      charge,
      "charge",
      "Supporter Plus",
      tax,
    )

  private def invoice(id: String, balance: Double, items: List[InvoiceItem]): ItemisedInvoice =
    ItemisedInvoice(id, cancellationDate, balance, balance, "Posted", items)

  private val balancingInvoice = invoice("balancing-1", -30, Nil)
  private val unpaidInvoice = invoice("unpaid-1", 20, List(item("A-S001", 20)))
  private val sharedInvoice = invoice(
    "unpaid-2",
    40,
    List(item("A-S001", 12, 1), item("A-S001", -3), item("A-S002", 30)),
  )
  private val summary = InvoiceTransactionSummary(List(balancingInvoice, unpaidInvoice, sharedInvoice))
  private val secondSummary = InvoiceTransactionSummary(
    List(
      invoice("balancing-2", -30, Nil),
      unpaidInvoice.copy(balance = 0),
      sharedInvoice.copy(balance = 30),
    ),
  )
  private val collectionCalls = List("account summary", "invoice subscriptions", "account subscriptions")
  private val cancellationCalls = List(
    "reason:A-S001",
    "cancel:A-S001",
    "transactions",
    "transfer:balancing-1",
    "apply:unpaid-1",
    "apply:unpaid-2",
  )
  private val secondCancellationCalls = List(
    "reason:A-S002",
    "cancel:A-S002",
    "transactions",
    "transfer:balancing-2",
    "apply:unpaid-2",
  )
  private val failureStages = cancellationCalls

  private def callsWithFailure(stage: String): List[String] = {
    val attempted = cancellationCalls.take(cancellationCalls.indexOf(stage) + 1)
    if (stage == "apply:unpaid-1") attempted :+ "apply:unpaid-2" else attempted
  }

  private class FakeOperations
      extends SubscriptionCancellation
      with CancellationReasonUpdater
      with GetInvoiceTransactions
      with CreditBalanceTransfer
      with CreditBalanceApplication
      with GetAccountSummary
      with GetAccountSubscriptions
      with GetSubscriptionsOnInvoice
      with EmailSender {
    val calls = ListBuffer.empty[String]
    val cancelledRequests = ListBuffer.empty[AutoCancelRequest]
    val orderDates = ListBuffer.empty[LocalDate]
    val calloutInvoiceIds = ListBuffer.empty[String]
    val transfers = ListBuffer.empty[(String, BigDecimal, String)]
    val applications = ListBuffer.empty[(String, Double, String)]
    val sentEmails = ListBuffer.empty[EmailMessage]
    var failures = Map.empty[String, ClientFailure]
    var invoiceResponses: List[ClientFailableOp[InvoiceTransactionSummary]] = List(ClientSuccess(summary))
    var subscriptionsToCancel: List[SubscriptionNumber] = List(request.subToCancel)

    private def run[A](operation: String)(result: => ClientFailableOp[A]): ClientFailableOp[A] = {
      calls += operation
      failures.get(operation) match {
        case Some(error) => error
        case None => result
      }
    }

    override def cancel(
        actual: AutoCancelRequest,
        calloutInvoiceId: String,
        date: LocalDate,
    ): ClientFailableOp[CancellationResponse] = {
      orderDates += date
      calloutInvoiceIds += calloutInvoiceId
      cancelledRequests += actual
      run(s"cancel:${actual.subToCancel.value}") {
        val invoiceId = actual.subToCancel.value match {
          case "A-S001" => "balancing-1"
          case "A-S002" => "balancing-2"
          case other => fail(s"Unexpected subscription $other")
        }
        ClientSuccess(CancellationResponse(invoiceId))
      }
    }

    override def update(subscription: SubscriptionNumber): ClientFailableOp[Unit] =
      run(s"reason:${subscription.value}")(ClientSuccess(()))

    override def getInvoiceTransactions(accountId: String): ClientFailableOp[InvoiceTransactionSummary] = {
      accountId shouldBe request.accountId
      run("transactions") {
        invoiceResponses should not be empty
        val response = invoiceResponses.head
        invoiceResponses = invoiceResponses.tail
        response
      }
    }

    override def transferToCreditBalance(id: String, amount: BigDecimal, comment: String): ClientFailableOp[Unit] = {
      transfers += ((id, amount, comment))
      run(s"transfer:$id")(ClientSuccess(()))
    }

    override def applyCreditBalance(id: String, amount: Double, comment: String): ClientFailableOp[Unit] = {
      applications += ((id, amount, comment))
      run(s"apply:$id")(ClientSuccess(()))
    }

    override def getAccountSummary(accountId: String): ClientFailableOp[AccountSummary] = {
      accountId shouldBe request.accountId
      run("account summary") {
        ClientSuccess(
          AccountSummary(
            BasicAccountInfo(AccountId(accountId), 60, PaymentMethodId("payment-method")),
            subscriptionsToCancel.map(subscription =>
              SubscriptionSummary(SubscriptionId(subscription.value), subscription.value, "Active"),
            ),
            List(
              Invoice("unpaid-1", LocalDate.of(2026, 10, 1), 20, "Posted"),
              Invoice("unpaid-2", cancellationDate, 40, "Posted"),
            ),
          ),
        )
      }
    }

    override def getAccountSubscriptions(accountId: String): ClientFailableOp[List[SubscriptionNumberWithStatus]] = {
      accountId shouldBe request.accountId
      run("account subscriptions")(
        ClientSuccess(
          subscriptionsToCancel.map(subscription => SubscriptionNumberWithStatus(subscription.value, "Active")),
        ),
      )
    }

    override def getSubscriptionsOnInvoice(invoiceId: String): ClientFailableOp[List[SubscriptionNumber]] = {
      invoiceId shouldBe callout.invoiceId
      run("invoice subscriptions")(ClientSuccess(subscriptionsToCancel))
    }

    override def send(message: EmailMessage): ClientFailableOp[Unit] = {
      sentEmails += message
      run("email")(ClientSuccess(()))
    }

    val autoCancel = new AutoCancel(this, this, this, this, this)

    def cancel(requests: List[AutoCancelRequest] = List(request)) =
      autoCancel.cancelAll(requests, callout.invoiceId, orderDate).toDisjunction

    val steps = new CalloutSteps(
      autoCancel,
      new AutoCancelDataCollectionFilter(this, this, this),
      new ZuoraEmailSteps(this, this),
    )

    def process() = steps.execute(callout, orderDate).toDisjunction

    def expectEmailInvoiceRead(): Unit =
      invoiceResponses = List(ClientSuccess(summary), ClientSuccess(summary))
  }

  "AutoCancel" should "cancel and balance invoices in order with the correct requests, tax and discounts" in {
    val operations = new FakeOperations

    operations.cancel() shouldBe Right(())

    operations.calls.toList shouldBe cancellationCalls
    operations.cancelledRequests.toList shouldBe List(request)
    operations.orderDates.toList shouldBe List(orderDate)
    operations.calloutInvoiceIds.toList shouldBe List(callout.invoiceId)
    operations.transfers.toList shouldBe List(("balancing-1", BigDecimal(30), "Auto-cancellation"))
    operations.applications.toList shouldBe List(
      ("unpaid-1", 20.0, "Auto-cancellation"),
      ("unpaid-2", 10.0, "Auto-cancellation"),
    )
  }

  failureStages.foreach { stage =>
    it should s"propagate failure at $stage without running dependent operations" in {
      val operations = new FakeOperations
      operations.failures = Map(stage -> failure)

      operations.cancel() shouldBe Left(internalServerError("AutoCancel failed"))

      operations.calls.toList shouldBe callsWithFailure(stage)
    }
  }

  it should "attempt the next subscription after an earlier cancellation fails" in {
    val operations = new FakeOperations
    operations.failures = Map("cancel:A-S001" -> failure)
    operations.invoiceResponses = List(ClientSuccess(secondSummary))

    operations.cancel(List(request, secondRequest)) shouldBe Left(internalServerError("AutoCancel failed"))

    operations.calls.toList shouldBe cancellationCalls.take(2) ++ secondCancellationCalls
    operations.cancelledRequests.toList shouldBe List(request, secondRequest)
    operations.orderDates.toList shouldBe List(orderDate, orderDate)
    operations.applications.toList shouldBe List(("unpaid-2", 30.0, "Auto-cancellation"))
  }

  it should "process all subscriptions with the same callout invoice and order date" in {
    val operations = new FakeOperations
    operations.invoiceResponses = List(ClientSuccess(summary), ClientSuccess(secondSummary))

    operations.cancel(List(request, secondRequest)) shouldBe Right(())

    operations.calls.toList shouldBe cancellationCalls ++ secondCancellationCalls
    operations.cancelledRequests.toList shouldBe List(request, secondRequest)
    operations.orderDates.toList shouldBe List(orderDate, orderDate)
    operations.calloutInvoiceIds.toList shouldBe List(callout.invoiceId, callout.invoiceId)
    operations.transfers.toList shouldBe List(
      ("balancing-1", BigDecimal(30), "Auto-cancellation"),
      ("balancing-2", BigDecimal(30), "Auto-cancellation"),
    )
    operations.applications.toList shouldBe List(
      ("unpaid-1", 20.0, "Auto-cancellation"),
      ("unpaid-2", 10.0, "Auto-cancellation"),
      ("unpaid-2", 30.0, "Auto-cancellation"),
    )
  }

  List(
    "the balancing invoice is missing" -> List(unpaidInvoice),
    "there are no unpaid invoices" -> List(balancingInvoice, invoice("settled", 0, Nil)),
  ).foreach { case (description, invoices) =>
    it should s"fail without transferring credit when $description" in {
      val operations = new FakeOperations
      operations.invoiceResponses = List(ClientSuccess(InvoiceTransactionSummary(invoices)))

      operations.cancel() shouldBe Left(internalServerError("AutoCancel failed"))

      operations.calls.toList shouldBe cancellationCalls.take(3)
    }
  }

  List(
    "no items" -> Nil,
    "no matching subscription items" -> List(item("other-1", 10), item("other-2", 10)),
  ).foreach { case (description, items) =>
    it should s"attempt later invoices even when an unpaid invoice has $description" in {
      val operations = new FakeOperations
      operations.invoiceResponses = List(
        ClientSuccess(
          InvoiceTransactionSummary(List(balancingInvoice, unpaidInvoice.copy(invoiceItems = items), sharedInvoice)),
        ),
      )

      operations.cancel() shouldBe Left(internalServerError("AutoCancel failed"))

      operations.calls.toList shouldBe cancellationCalls.take(4) :+ "apply:unpaid-2"
      operations.applications.toList shouldBe List(("unpaid-2", 10.0, "Auto-cancellation"))
    }
  }

  "CalloutSteps" should "send the cancellation email only after all credit work succeeds" in {
    val operations = new FakeOperations
    operations.expectEmailInvoiceRead()

    operations.process() shouldBe Right(())

    operations.calls.toList shouldBe collectionCalls ++ cancellationCalls ++ List(
      "transactions",
      "email",
    )
    operations.cancelledRequests.toList shouldBe List(request)
    operations.sentEmails should have size 1
    val message = operations.sentEmails.head
    message.To.Address shouldBe callout.email.get
    message.SfContactId shouldBe callout.sfContactId
    message.DataExtensionName shouldBe "cancelled-payment-email"
    val attributes = message.To.ContactAttributes.SubscriberAttributes
    attributes.subscriber_id shouldBe request.subToCancel.value
    attributes.product shouldBe "Supporter Plus"
    attributes.primaryKey shouldBe InvoiceId(callout.invoiceId)
  }

  it should "process all subscriptions before sending the callout's cancellation email" in {
    val operations = new FakeOperations
    operations.subscriptionsToCancel = List(request.subToCancel, secondRequest.subToCancel)
    operations.invoiceResponses = List(ClientSuccess(summary), ClientSuccess(secondSummary), ClientSuccess(summary))

    operations.process() shouldBe Right(())

    operations.calls.toList shouldBe
      collectionCalls ++ cancellationCalls ++ secondCancellationCalls ++ List(
        "transactions",
        "email",
      )
    operations.cancelledRequests.toList shouldBe List(request, secondRequest)
    operations.calloutInvoiceIds.toList shouldBe List(callout.invoiceId, callout.invoiceId)
    operations.sentEmails should have size 1
  }

  failureStages.foreach { stage =>
    it should s"not send an email when $stage fails" in {
      val operations = new FakeOperations
      operations.failures = Map(stage -> failure)

      operations.process() shouldBe Left(internalServerError("AutoCancel failed"))

      operations.calls.toList shouldBe collectionCalls ++ callsWithFailure(stage)
      operations.sentEmails shouldBe empty
    }
  }

  it should "propagate an email sending failure after completing cancellation" in {
    val operations = new FakeOperations
    operations.expectEmailInvoiceRead()
    operations.failures = Map("email" -> failure)

    operations.process() shouldBe Left(internalServerError("send email"))

    operations.calls.toList shouldBe collectionCalls ++ cancellationCalls ++ List(
      "transactions",
      "email",
    )
    operations.sentEmails should have size 1
  }

  it should "not send an email when fetching its invoice data fails" in {
    val operations = new FakeOperations
    operations.invoiceResponses = List(ClientSuccess(summary), failure)

    operations.process() shouldBe Left(internalServerError("send email"))

    operations.calls.toList shouldBe collectionCalls ++ cancellationCalls :+ "transactions"
    operations.sentEmails shouldBe empty
  }

}

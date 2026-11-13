package com.gu.autoCancel

import com.gu.autoCancel.AutoCancel.{AutoCancelRequest, CancellationResponse}
import com.gu.util.TypeConvert._
import com.gu.util.apigateway.ApiGatewayResponse.internalServerError
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, ClientSuccess, GenericError}
import com.gu.util.zuora._
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
  private val calloutInvoiceId = "unpaid-1"

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
      with CreditBalanceApplication {
    val calls = ListBuffer.empty[String]
    val cancelledRequests = ListBuffer.empty[AutoCancelRequest]
    val orderDates = ListBuffer.empty[LocalDate]
    val calloutInvoiceIds = ListBuffer.empty[String]
    val transfers = ListBuffer.empty[(String, BigDecimal, String)]
    val applications = ListBuffer.empty[(String, Double, String)]
    var failures = Map.empty[String, ClientFailure]
    var throwAt = Set.empty[String]
    var invoiceResponses: List[ClientFailableOp[InvoiceTransactionSummary]] = List(ClientSuccess(summary))

    private def run[A](operation: String)(result: => ClientFailableOp[A]): ClientFailableOp[A] = {
      calls += operation
      if (throwAt.contains(operation)) throw new RuntimeException(s"$operation threw")
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
        ClientSuccess(CancellationResponse(invoiceId, OrderNumber(s"O-${actual.subToCancel.value.stripPrefix("A-S")}")))
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

    val balancing: InvoiceBalancing = new ZuoraInvoiceBalancing(this, this, this)

    def cancel(requests: List[AutoCancelRequest] = List(request)) =
      (for {
        cancellations <- AutoCancel(this, this)(requests, calloutInvoiceId, orderDate)
        _ <- balancing.balance(cancellations)
      } yield ()).toApiGatewayOp("AutoCancel failed").toDisjunction
  }

  "AutoCancel and InvoiceBalancing" should "cancel and balance with the correct requests, tax and discounts" in {
    val operations = new FakeOperations

    operations.cancel() shouldBe Right(())

    operations.calls.toList shouldBe cancellationCalls
    operations.cancelledRequests.toList shouldBe List(request)
    operations.orderDates.toList shouldBe List(orderDate)
    operations.calloutInvoiceIds.toList shouldBe List(calloutInvoiceId)
    operations.transfers.toList shouldBe List(("balancing-1", BigDecimal(30), "Auto-cancellation"))
    operations.applications.toList shouldBe List(
      ("unpaid-1", 20.0, "Auto-cancellation"),
      ("unpaid-2", 10.0, "Auto-cancellation"),
    )
  }

  it should "return each subscription paired with its cancellation response without balancing it" in {
    val operations = new FakeOperations

    AutoCancel(operations, operations)(List(request, secondRequest), calloutInvoiceId, orderDate).toDisjunction shouldBe
      Right(
        List(
          AutoCancel.CancelledSubscription(request, CancellationResponse("balancing-1", OrderNumber("O-001"))),
          AutoCancel.CancelledSubscription(secondRequest, CancellationResponse("balancing-2", OrderNumber("O-002"))),
        ),
      )

    operations.calls.toList shouldBe cancellationCalls.take(2) ++ secondCancellationCalls.take(2)
    operations.transfers shouldBe empty
  }

  failureStages.foreach { stage =>
    it should s"propagate failure at $stage without running dependent operations" in {
      val operations = new FakeOperations
      operations.failures = Map(stage -> failure)

      operations.cancel() shouldBe Left(internalServerError("AutoCancel failed"))

      operations.calls.toList shouldBe callsWithFailure(stage)
    }
  }

  it should "attempt the next cancellation but skip all balancing after an earlier cancellation fails" in {
    val operations = new FakeOperations
    operations.failures = Map("cancel:A-S001" -> failure)
    operations.invoiceResponses = List(ClientSuccess(secondSummary))

    operations.cancel(List(request, secondRequest)) shouldBe Left(internalServerError("AutoCancel failed"))

    operations.calls.toList shouldBe cancellationCalls.take(2) ++ secondCancellationCalls.take(2)
    operations.cancelledRequests.toList shouldBe List(request, secondRequest)
    operations.orderDates.toList shouldBe List(orderDate, orderDate)
    operations.applications shouldBe empty
    operations.transfers shouldBe empty
  }

  it should "skip balancing an earlier successful cancellation when a later cancellation fails" in {
    val operations = new FakeOperations
    operations.failures = Map("cancel:A-S002" -> failure)

    operations.cancel(List(request, secondRequest)) shouldBe Left(internalServerError("AutoCancel failed"))

    operations.calls.toList shouldBe cancellationCalls.take(2) ++ secondCancellationCalls.take(2)
    operations.applications shouldBe empty
    operations.transfers shouldBe empty
  }

  it should "process all subscriptions with the same callout invoice and order date" in {
    val operations = new FakeOperations
    operations.invoiceResponses = List(ClientSuccess(summary), ClientSuccess(secondSummary))

    operations.cancel(List(request, secondRequest)) shouldBe Right(())

    operations.calls.toList shouldBe
      cancellationCalls.take(2) ++ secondCancellationCalls.take(2) ++
      cancellationCalls.drop(2) ++ secondCancellationCalls.drop(2)
    operations.cancelledRequests.toList shouldBe List(request, secondRequest)
    operations.orderDates.toList shouldBe List(orderDate, orderDate)
    operations.calloutInvoiceIds.toList shouldBe List(calloutInvoiceId, calloutInvoiceId)
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

  it should "let unexpected balancing exceptions escape instead of converting them into business failures" in {
    val operations = new FakeOperations
    operations.throwAt = Set("transfer:balancing-1")
    operations.invoiceResponses = List(ClientSuccess(summary), ClientSuccess(secondSummary))

    val error = intercept[RuntimeException] {
      operations.cancel(List(request, secondRequest))
    }

    error.getMessage shouldBe "transfer:balancing-1 threw"
    operations.transfers.map(_._1).toList shouldBe List("balancing-1")
  }

  it should "let unexpected cancellation exceptions escape instead of continuing the cancellation loop" in {
    val operations = new FakeOperations
    operations.throwAt = Set("cancel:A-S001")
    operations.invoiceResponses = List(ClientSuccess(secondSummary))

    val error = intercept[RuntimeException] {
      operations.cancel(List(request, secondRequest))
    }

    error.getMessage shouldBe "cancel:A-S001 threw"
    operations.calls.toList shouldBe cancellationCalls.take(2)
    operations.applications shouldBe empty
    operations.transfers shouldBe empty
  }

  it should "perform no cancellations or balancing for an empty request list" in {
    val operations = new FakeOperations

    operations.cancel(Nil) shouldBe Right(())

    operations.calls shouldBe empty
  }
}

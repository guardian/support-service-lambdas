package com.gu.autoCancel

import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import com.gu.util.zuora.{CreditBalanceApplication, SubscriptionNumber}
import com.gu.util.zuora.ZuoraGetInvoiceTransactions.{InvoiceItem, ItemisedInvoice}
import org.scalamock.scalatest.MockFactory
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import java.time.LocalDate
import scala.collection.mutable.ListBuffer

class AutoCancelTest extends AnyFlatSpec with Matchers with MockFactory {

  "attemptAll" should "attempt every cancellation before returning the first failure" in {
    val first = AutoCancel.AutoCancelRequest("account", SubscriptionNumber("first"), LocalDate.of(2026, 8, 18))
    val second = AutoCancel.AutoCancelRequest("account", SubscriptionNumber("second"), LocalDate.of(2026, 8, 18))
    val execute = mockFunction[AutoCancel.AutoCancelRequest, ClientFailableOp[Unit]]
    val failure = GenericError("first cancellation failed")

    inSequence {
      execute.expects(first).returning(failure).once()
      execute.expects(second).returning(ClientSuccess(())).once()
    }

    AutoCancel.attemptAll(List(first, second))(execute) shouldBe failure
  }

  it should "succeed without invoking the operation for an empty collection" in {
    val attempted = ListBuffer.empty[Int]

    AutoCancel.attemptAll(List.empty[Int]) { item =>
      attempted += item
      ClientSuccess(item.toString)
    } shouldBe ClientSuccess(List.empty[String])

    attempted shouldBe empty
  }

  it should "attempt each item once and return successful values in input order" in {
    val attempted = ListBuffer.empty[Int]

    AutoCancel.attemptAll(List(3, 1, 2)) { item =>
      attempted += item
      ClientSuccess(item.toString)
    } shouldBe ClientSuccess(List("3", "1", "2"))

    attempted.toList shouldBe List(3, 1, 2)
  }

  "applyCreditBalances" should "apply credit to multiple invoices" in {
    val subToCancel = SubscriptionNumber("s1")
    val applyCreditBalance = mock[CreditBalanceApplication]
    (applyCreditBalance.applyCreditBalance _).expects("invoice1", 12.34, "comment").returning(ClientSuccess(())).once()
    (applyCreditBalance.applyCreditBalance _).expects("invoice2", 11.34, "comment").returning(ClientSuccess(())).once()
    val invoices = Seq(
      ItemisedInvoice(
        id = "invoice1",
        invoiceDate = LocalDate.of(2022, 1, 1),
        amount = 12.34,
        balance = 12.34,
        status = "Posted",
        invoiceItems = List(
          InvoiceItem(
            id = "item1",
            subscriptionName = subToCancel.value,
            serviceStartDate = LocalDate.of(2022, 1, 3),
            serviceEndDate = LocalDate.of(2022, 2, 2),
            chargeAmount = 12.34,
            chargeName = "chg",
            productName = "prd",
            taxAmount = 0,
          ),
        ),
      ),
      ItemisedInvoice(
        id = "invoice2",
        invoiceDate = LocalDate.of(2022, 1, 1),
        amount = 11.34,
        balance = 11.34,
        status = "Posted",
        invoiceItems = List(
          InvoiceItem(
            id = "item1",
            subscriptionName = "s2",
            serviceStartDate = LocalDate.of(2022, 1, 3),
            serviceEndDate = LocalDate.of(2022, 2, 2),
            chargeAmount = 11.34,
            chargeName = "chg",
            productName = "prd",
            taxAmount = 0,
          ),
        ),
      ),
    )
    AutoCancel.applyCreditBalances(applyCreditBalance)(subToCancel, invoices, "comment") shouldBe ClientSuccess(())
  }

  it should "apply partial credit to an invoice for multiple subscriptions" in {
    val subToCancel = SubscriptionNumber("s1")
    val applyCreditBalance = mock[CreditBalanceApplication]
    (applyCreditBalance.applyCreditBalance _).expects("invoice1", 6.87, "comment").returning(ClientSuccess(())).once()
    val invoices = Seq(
      ItemisedInvoice(
        id = "invoice1",
        invoiceDate = LocalDate.of(2022, 1, 1),
        amount = 12.34,
        balance = 12.34,
        status = "Posted",
        invoiceItems = List(
          InvoiceItem(
            id = "item1",
            subscriptionName = subToCancel.value,
            serviceStartDate = LocalDate.of(2022, 1, 3),
            serviceEndDate = LocalDate.of(2022, 2, 2),
            chargeAmount = 6.87,
            chargeName = "chg",
            productName = "prd",
            taxAmount = 0,
          ),
          InvoiceItem(
            id = "item2",
            subscriptionName = "s2",
            serviceStartDate = LocalDate.of(2022, 1, 4),
            serviceEndDate = LocalDate.of(2022, 2, 5),
            chargeAmount = 5.47,
            chargeName = "chg",
            productName = "prd",
            taxAmount = 0,
          ),
        ),
      ),
    )
    AutoCancel.applyCreditBalances(applyCreditBalance)(subToCancel, invoices, "comment") shouldBe ClientSuccess(())
  }

  it should "apply partial credit to an invoice for all items of the subscription to cancel" in {
    val subToCancel = SubscriptionNumber("s1")
    val applyCreditBalance = mock[CreditBalanceApplication]
    (applyCreditBalance.applyCreditBalance _).expects("invoice1", 11.09, "comment").returning(ClientSuccess(())).once()
    val invoices = Seq(
      ItemisedInvoice(
        id = "invoice1",
        invoiceDate = LocalDate.of(2022, 1, 1),
        amount = 12.34,
        balance = 12.34,
        status = "Posted",
        invoiceItems = List(
          InvoiceItem(
            id = "item1",
            subscriptionName = subToCancel.value,
            serviceStartDate = LocalDate.of(2022, 1, 3),
            serviceEndDate = LocalDate.of(2022, 2, 2),
            chargeAmount = 6.87,
            chargeName = "chg",
            productName = "prd",
            taxAmount = 0,
          ),
          InvoiceItem(
            id = "item3",
            subscriptionName = subToCancel.value,
            serviceStartDate = LocalDate.of(2022, 1, 3),
            serviceEndDate = LocalDate.of(2022, 2, 2),
            chargeAmount = 5.45,
            chargeName = "chg",
            productName = "prd",
            taxAmount = 0,
          ),
          InvoiceItem(
            id = "item4",
            subscriptionName = subToCancel.value,
            serviceStartDate = LocalDate.of(2022, 1, 3),
            serviceEndDate = LocalDate.of(2022, 2, 2),
            chargeAmount = -1.23,
            chargeName = "discount",
            productName = "discount",
            taxAmount = 0,
          ),
          InvoiceItem(
            id = "item2",
            subscriptionName = "s2",
            serviceStartDate = LocalDate.of(2022, 1, 4),
            serviceEndDate = LocalDate.of(2022, 2, 5),
            chargeAmount = 5.47,
            chargeName = "chg",
            productName = "prd",
            taxAmount = 0,
          ),
        ),
      ),
    )
    AutoCancel.applyCreditBalances(applyCreditBalance)(subToCancel, invoices, "comment") shouldBe ClientSuccess(())
  }

  it should "apply credit including items tax amount (not just charge amount)" in {
    val subToCancel = SubscriptionNumber("s1")
    val applyCreditBalance = mock[CreditBalanceApplication]
    (applyCreditBalance.applyCreditBalance _).expects("invoice1", 26.00, "comment").returning(ClientSuccess(())).once()
    val invoices = Seq(
      ItemisedInvoice(
        id = "invoice1",
        invoiceDate = LocalDate.of(2022, 1, 1),
        amount = 26.00,
        balance = 26.00,
        status = "Posted",
        invoiceItems = List(
          InvoiceItem(
            id = "item1",
            subscriptionName = subToCancel.value,
            serviceStartDate = LocalDate.of(2022, 1, 3),
            serviceEndDate = LocalDate.of(2022, 2, 2),
            chargeAmount = 12.34,
            chargeName = "chg",
            productName = "prd",
            taxAmount = 0.66,
          ),
          InvoiceItem(
            id = "item2",
            subscriptionName = subToCancel.value,
            serviceStartDate = LocalDate.of(2022, 1, 3),
            serviceEndDate = LocalDate.of(2022, 2, 2),
            chargeAmount = 12.34,
            chargeName = "chg",
            productName = "prd",
            taxAmount = 0.66,
          ),
        ),
      ),
    )
    AutoCancel.applyCreditBalances(applyCreditBalance)(subToCancel, invoices, "comment") shouldBe ClientSuccess(())
  }

  "attemptAll" should "retain the first failure when several subscriptions fail and still attempt later subscriptions" in {
    val requests = List("first", "second", "third", "fourth").map { subscription =>
      AutoCancel.AutoCancelRequest("account", SubscriptionNumber(subscription), LocalDate.of(2026, 10, 20))
    }
    val execute = mockFunction[AutoCancel.AutoCancelRequest, ClientFailableOp[Unit]]
    val firstFailure = GenericError("first failure")
    val secondFailure = GenericError("second failure")

    inSequence {
      execute.expects(requests(0)).returning(ClientSuccess(())).once()
      execute.expects(requests(1)).returning(firstFailure).once()
      execute.expects(requests(2)).returning(secondFailure).once()
      execute.expects(requests(3)).returning(ClientSuccess(())).once()
    }

    AutoCancel.attemptAll(requests)(execute) shouldBe firstFailure
  }

  "applyCreditBalances" should "retain the first failure when several invoices fail and still attempt later invoices" in {
    val subscription = SubscriptionNumber("A-S001")
    val date = LocalDate.of(2026, 10, 20)
    val invoices = List("first", "second", "third", "fourth").map { id =>
      ItemisedInvoice(
        id = id,
        invoiceDate = date,
        amount = 10,
        balance = 10,
        status = "Posted",
        invoiceItems = List(InvoiceItem(s"$id-item", subscription.value, date, date, 10, "charge", "product", 0)),
      )
    }
    val applyCredit = mock[CreditBalanceApplication]
    val firstFailure = GenericError("first failure")
    val secondFailure = GenericError("second failure")

    inSequence {
      (applyCredit.applyCreditBalance _).expects("first", 10.0, "Auto-cancellation").returning(ClientSuccess(())).once()
      (applyCredit.applyCreditBalance _).expects("second", 10.0, "Auto-cancellation").returning(firstFailure).once()
      (applyCredit.applyCreditBalance _).expects("third", 10.0, "Auto-cancellation").returning(secondFailure).once()
      (applyCredit.applyCreditBalance _)
        .expects("fourth", 10.0, "Auto-cancellation")
        .returning(ClientSuccess(()))
        .once()
    }

    AutoCancel.applyCreditBalances(applyCredit)(subscription, invoices, "Auto-cancellation") shouldBe firstFailure
  }
}

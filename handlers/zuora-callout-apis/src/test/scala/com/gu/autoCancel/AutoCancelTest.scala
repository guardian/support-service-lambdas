package com.gu.autoCancel

import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import com.gu.util.zuora.SubscriptionNumber
import com.gu.util.zuora.ZuoraGetInvoiceTransactions.{InvoiceItem, ItemisedInvoice}
import org.scalamock.scalatest.MockFactory
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import java.time.LocalDate

class AutoCancelTest extends AnyFlatSpec with Matchers with MockFactory {

  "applyCreditBalances" should "apply credit to multiple invoices" in {
    val subToCancel = SubscriptionNumber("s1")
    val applyCreditBalance = mockFunction[String, Double, String, ClientFailableOp[Unit]]
    applyCreditBalance.expects("invoice1", 12.34, "comment").returning(ClientSuccess(())).once()
    applyCreditBalance.expects("invoice2", 11.34, "comment").returning(ClientSuccess(())).once()
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
            productName = "prd"
          )
        )
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
            productName = "prd"
          )
        )
      )
    )
    AutoCancel.applyCreditBalances(applyCreditBalance)(subToCancel, invoices, "comment")
  }

  it should "apply partial credit to an invoice for multiple subscriptions" in {
    val subToCancel = SubscriptionNumber("s1")
    val applyCreditBalance = mockFunction[String, Double, String, ClientFailableOp[Unit]]
    applyCreditBalance.expects("invoice1", 6.87, "comment").returning(ClientSuccess(())).once()
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
            productName = "prd"
          ),
          InvoiceItem(
            id = "item2",
            subscriptionName = "s2",
            serviceStartDate = LocalDate.of(2022, 1, 4),
            serviceEndDate = LocalDate.of(2022, 2, 5),
            chargeAmount = 5.47,
            chargeName = "chg",
            productName = "prd"
          )
        )
      )
    )
    AutoCancel.applyCreditBalances(applyCreditBalance)(subToCancel, invoices, "comment")
  }

  it should "apply partial credit to an invoice for all items of the subscription to cancel" in {
    val subToCancel = SubscriptionNumber("s1")
    val applyCreditBalance = mockFunction[String, Double, String, ClientFailableOp[Unit]]
    applyCreditBalance.expects("invoice1", 11.09, "comment").returning(ClientSuccess(())).once()
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
            productName = "prd"
          ),
          InvoiceItem(
            id = "item3",
            subscriptionName = subToCancel.value,
            serviceStartDate = LocalDate.of(2022, 1, 3),
            serviceEndDate = LocalDate.of(2022, 2, 2),
            chargeAmount = 5.45,
            chargeName = "chg",
            productName = "prd"
          ),
          InvoiceItem(
            id = "item4",
            subscriptionName = subToCancel.value,
            serviceStartDate = LocalDate.of(2022, 1, 3),
            serviceEndDate = LocalDate.of(2022, 2, 2),
            chargeAmount = -1.23,
            chargeName = "discount",
            productName = "discount"
          ),
          InvoiceItem(
            id = "item2",
            subscriptionName = "s2",
            serviceStartDate = LocalDate.of(2022, 1, 4),
            serviceEndDate = LocalDate.of(2022, 2, 5),
            chargeAmount = 5.47,
            chargeName = "chg",
            productName = "prd"
          )
        )
      )
    )
    AutoCancel.applyCreditBalances(applyCreditBalance)(subToCancel, invoices, "comment")
  }
}

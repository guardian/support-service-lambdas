package com.gu.productmove.refund

import com.gu.productmove.zuora.InvoiceItemQuery.InvoiceItem
import com.gu.productmove.zuora.RunBilling.InvoiceId
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.{InvoiceItemQuery, InvoiceItemWithTaxDetails, RefundInvoiceDetails, TaxDetails}
import zio.{RIO, Task, ZIO}

import java.time.LocalDateTime

object GetRefundInvoiceDetails {

  def get(subscriptionName: SubscriptionName): RIO[InvoiceItemQuery, RefundInvoiceDetails] = {
    for {
      invoiceItemQuery <- ZIO.service[InvoiceItemQuery]
      invoiceItems <- invoiceItemQuery.invoiceItemsForSubscription(subscriptionName)
      itemsByInvoice <- groupInvoices(invoiceItems)
      refundAmount = itemsByInvoice.getLastPaidInvoiceAmount
      lastPaidInvoiceId = itemsByInvoice.latestId
      negativeInvoiceId = itemsByInvoice.earliestId
      negativeInvoiceItems = itemsByInvoice.earliestItems
      taxationItems <-
        if (invoiceItems.exists(_.TaxAmount > 0)) {
          println("Invoice items have tax, fetching taxation items")
          invoiceItemQuery.taxationItemsForInvoice(negativeInvoiceId)
        } else ZIO.succeed(Nil)
    } yield RefundInvoiceDetails(
      refundAmount,
      negativeInvoiceId,
      negativeInvoiceItems.map(i => InvoiceItemWithTaxDetails(i, taxationItems)),
      lastPaidInvoiceId,
    )

  }

  private def groupInvoices(items: List[InvoiceItem]): Task[InvoiceGroups] = {
    val invoices: Map[InvoiceId, List[InvoiceItem]] = items.groupBy(_.InvoiceId)
    val invoiceItemGroups = for {
      (latestId, latestItems) <- invoices.maxByOption(getDate)
      (earliestId, earliestItems) <- invoices.minByOption(getDate)
      if latestId != earliestId
    } yield ZIO.succeed(InvoiceGroups(latestId, latestItems, earliestId, earliestItems))
    invoiceItemGroups.getOrElse {
      ZIO.fail(
        new Throwable(
          s"There was only one invoice item in response $items this is an error " +
            s"as we need the cancellation invoice items to carry out a refund",
        ),
      )
    }
  }

  private def getDate(invoiceId: InvoiceId, invoiceItems: List[InvoiceItem]) =
    invoiceItems.headOption.map(_.chargeDateAsDateTime).getOrElse(LocalDateTime.MIN)

  case class InvoiceGroups(
      latestId: InvoiceId,
      latestItems: List[InvoiceItem],
      earliestId: InvoiceId,
      earliestItems: List[InvoiceItem],
  ) {

    lazy val getLastPaidInvoiceAmount: BigDecimal =
      latestItems.map(invoice => invoice.ChargeAmount + invoice.TaxAmount).sum

  }

}

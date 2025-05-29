package com.gu.productmove.refund

import com.gu.productmove.zuora.InvoiceItemQuery
import com.gu.productmove.zuora.InvoiceItemQuery.InvoiceItem
import com.gu.productmove.zuora.model.{InvoiceId, SubscriptionName}
import zio.{RIO, Task, ZIO}

import java.time.format.DateTimeFormatter
import java.time.{LocalDate, LocalDateTime}

object GetRefundInvoiceDetails {

  def get(subscriptionName: SubscriptionName): RIO[InvoiceItemQuery, RefundInvoiceDetails] = {
    for {
      invoiceItemQuery <- ZIO.service[InvoiceItemQuery]
      invoiceItems <- invoiceItemQuery.invoiceItemsForSubscription(subscriptionName)
      itemsByInvoice <- groupInvoices(invoiceItems)
      refundAmount = itemsByInvoice.getLastPaidInvoiceAmount
      lastPaidInvoiceId = itemsByInvoice.previousId
      negativeInvoiceId = itemsByInvoice.latestId
      negativeInvoiceItems = itemsByInvoice.latestItems
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
      (previousId, previousItems) <- invoices.-(latestId).maxByOption(getDate)
    } yield ZIO.succeed(InvoiceGroups(latestId, latestItems, previousId, previousItems))
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
      previousId: InvoiceId,
      previousItems: List[InvoiceItem],
  ) {

    lazy val getLastPaidInvoiceAmount: BigDecimal =
      previousItems.map(invoice => invoice.ChargeAmount + invoice.TaxAmount).sum

  }

}

case class RefundInvoiceDetails(
    refundAmount: BigDecimal,
    negativeInvoiceId: InvoiceId,
    negativeInvoiceItems: List[InvoiceItemWithTaxDetails],
    lastPaidInvoiceId: InvoiceId,
)
case class TaxDetails(amount: BigDecimal, taxationId: String)

object InvoiceItemWithTaxDetails {

  def apply(i: InvoiceItem, taxationItems: List[InvoiceItemQuery.TaxationItem]): InvoiceItemWithTaxDetails = {

    val maybeTaxDetails = for {
      negativeInvoiceItem <- Some(i).filter(_.TaxAmount != 0)
      _ = println(
        s"Tax amount for invoice item $i is ${negativeInvoiceItem.TaxAmount} searching for matching taxation item",
      )
      taxationItem <- taxationItems.find(_.InvoiceItemId == negativeInvoiceItem.Id)
      _ = println(s"Found taxation item $taxationItem")
    } yield TaxDetails(i.TaxAmount, taxationItem.Id)

    InvoiceItemWithTaxDetails(
      Id = i.Id,
      AppliedToInvoiceItemId = i.AppliedToInvoiceItemId,
      ChargeDate = i.ChargeDate,
      ChargeAmount = i.ChargeAmount,
      TaxDetails = maybeTaxDetails,
      InvoiceId = i.InvoiceId,
    )

  }

}
case class InvoiceItemWithTaxDetails(
    Id: String,
    AppliedToInvoiceItemId: Option[String] = None,
    ChargeDate: String,
    ChargeAmount: BigDecimal,
    TaxDetails: Option[TaxDetails],
    InvoiceId: InvoiceId,
) {
  def taxAmount = TaxDetails.map(_.amount).getOrElse(BigDecimal(0))
  def amountWithTax = ChargeAmount + taxAmount
  def chargeDateAsDate = LocalDate.parse(ChargeDate, DateTimeFormatter.ISO_OFFSET_DATE_TIME)
}

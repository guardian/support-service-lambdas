package com.gu.productmove.zuora

import zio.{IO, ZIO}
import zio.*
import zio.Clock
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.PreviewResult

object BuildPreviewResult {
  def getPreviewResult(
      invoice: SubscriptionUpdateInvoice,
      ids: SupporterPlusRatePlanIds,
  ): ZIO[Stage, String, PreviewResult] = {
    val (supporterPlusInvoices, contributionInvoices) =
      invoice.invoiceItems.partition(_.productRatePlanChargeId == ids.subscriptionRatePlanChargeId)

    (supporterPlusInvoices.length, contributionInvoices.length) match {
      case (n1, n2) if n1 > 1 && n2 >= 1 =>
        for {
          date <- Clock.currentDateTime.map(_.toLocalDate)
          contributionRefundInvoice = contributionInvoices
            .filter(invoiceItem =>
              invoiceItem.totalAmount <= 0 &&
                invoiceItem.serviceStartDate == date,
            )
            .head
          supporterPlusInvoiceItems = supporterPlusInvoices.sortWith((i1, i2) =>
            i1.serviceStartDate.isBefore(i2.serviceStartDate),
          )
        } yield PreviewResult(
          supporterPlusInvoiceItems.head.totalAmount - contributionRefundInvoice.totalAmount.abs,
          contributionRefundInvoice.totalAmount,
          supporterPlusInvoiceItems.head.totalAmount,
          supporterPlusInvoiceItems(1).serviceStartDate,
        )
      case (_, _) =>
        ZIO.fail(
          s"Unexpected invoice item structure was returned from a Zuora preview call. Invoice data was: $invoice",
        )
    }
  }
}

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
  ): ZIO[Stage, String, PreviewResult] =
    invoice.invoiceItems.partition(_.productRatePlanChargeId == ids.ratePlanChargeId) match
      case (supporterPlusInvoice :: Nil, contributionInvoices) =>
        for {
          date <- Clock.currentDateTime.map(_.toLocalDate)
          contributionRefundInvoice = contributionInvoices
            .filter(invoiceItem =>
              invoiceItem.totalAmount <= 0 &&
                invoiceItem.serviceStartDate == date,
            )
            .head
        } yield PreviewResult(
          supporterPlusInvoice.totalAmount - contributionRefundInvoice.totalAmount.abs,
          contributionRefundInvoice.totalAmount,
          supporterPlusInvoice.totalAmount,
        )
      case _ =>
        ZIO.fail(
          s"Unexpected invoice item structure was returned from a Zuora preview call. Invoice data was: $invoice",
        )
}

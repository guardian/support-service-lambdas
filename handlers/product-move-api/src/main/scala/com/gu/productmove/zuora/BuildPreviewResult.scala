package com.gu.productmove.zuora

import zio.{IO, ZIO}
import zio.*
import zio.Clock
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.PreviewResult
import com.gu.productmove.zuora.GetSubscription.RatePlanCharge

object BuildPreviewResult {
  def getPreviewResult(
      currentRatePlanCharge: RatePlanCharge,
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
      case (n1, n2) if n1 > 1 && n2 == 0 =>
        for {
          date <- Clock.currentDateTime.map(_.toLocalDate)
          isRenewalDate = currentRatePlanCharge.effectiveStartDate == date
          priceDifference = if (isRenewalDate) currentRatePlanCharge.price else 0
          supporterPlusInvoiceItems = supporterPlusInvoices.sortWith((i1, i2) =>
            i1.serviceStartDate.isBefore(i2.serviceStartDate),
          )
          _ <- ZIO.when(priceDifference == 0)(
            ZIO.fail(
              s"Unexpected invoice item structure was returned from a Zuora preview call. Subscription number is $subnumber. Invoice data was: $invoice",
            ),
          )
        } yield PreviewResult(
          supporterPlusInvoiceItems.head.totalAmount - priceDifference,
          priceDifference,
          supporterPlusInvoiceItems.head.totalAmount,
          supporterPlusInvoiceItems(1).serviceStartDate,
        )
      case (_, _) =>
        ZIO.fail(
          s"Unexpected invoice item structure was returned from a Zuora preview call. Subscription number is $subnumber. Invoice data was: $invoice",
        )
    }
  }
}

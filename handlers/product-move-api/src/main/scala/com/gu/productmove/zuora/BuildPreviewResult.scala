package com.gu.productmove.move

import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.PreviewResult
import com.gu.productmove.zuora.GetSubscription.RatePlanCharge
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.endpoint.move.SupporterPlusRatePlanIds
import com.gu.productmove.zuora.SubscriptionUpdateInvoice
import zio.{Clock, ZIO}
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError, PreviewResult}

object BuildPreviewResult {
  def isBelowMinimumStripeCharge(amount: BigDecimal): Boolean =
    amount > BigDecimal(0) && amount < BigDecimal(0.50)
  def getPreviewResult(
      subscriptionName: SubscriptionName,
      activeRatePlanCharge: RatePlanCharge,
      invoice: SubscriptionUpdateInvoice,
      ids: SupporterPlusRatePlanIds,
  ): ZIO[Stage, ErrorResponse, PreviewResult] =
    Clock.currentDateTime.map(_.toLocalDate).flatMap { today =>
      val (supporterPlusInvoices, contributionInvoices) =
        invoice.invoiceItems.partition(_.productRatePlanChargeId == ids.subscriptionRatePlanChargeId)

      val supporterPlusInvoiceItems =
        supporterPlusInvoices.sortWith((i1, i2) => i1.serviceStartDate.isBefore(i2.serviceStartDate))

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
            amountPayableToday = supporterPlusInvoiceItems.head.totalAmount - contributionRefundInvoice.totalAmount.abs
          } yield PreviewResult(
            amountPayableToday,
            isBelowMinimumStripeCharge(amountPayableToday),
            contributionRefundInvoice.totalAmount,
            supporterPlusInvoiceItems.head.totalAmount,
            supporterPlusInvoiceItems(1).serviceStartDate,
          )
        /*
              Term renewal for many subs happens during the billing run on the renewal day which is scheduled for around 6am BST.
              During this billing run, Zuora does not return the contribution invoice item, only supporter plus invoice items.
              When this happens we can just use the full price of the active rate plan as the amount to be refunded
         */
        case (n1, n2) if n1 > 1 && n2 == 0 && supporterPlusInvoiceItems.head.serviceStartDate == today =>
          val supporterPlusInvoiceItems =
            supporterPlusInvoices.sortWith((i1, i2) => i1.serviceStartDate.isBefore(i2.serviceStartDate))

          for {
            _ <- ZIO.log(s"Entered edge case. Subscription name is $subscriptionName. Invoice data was: $invoice")
            priceDifference <- ZIO
              .fromOption(activeRatePlanCharge.price)
              .orElseFail(
                InternalServerError(
                  s"Price is null on rate plan. Subscription name is $subscriptionName. Invoice data was: $invoice",
                ),
              )
            amountPayableToday = supporterPlusInvoiceItems.head.totalAmount - BigDecimal.valueOf(priceDifference)
          } yield PreviewResult(
            supporterPlusInvoiceItems.head.totalAmount - BigDecimal.valueOf(priceDifference),
            isBelowMinimumStripeCharge(amountPayableToday),
            BigDecimal.valueOf(priceDifference),
            supporterPlusInvoiceItems.head.totalAmount,
            supporterPlusInvoiceItems(1).serviceStartDate,
          )
        case (_, _) =>
          ZIO.fail(
            InternalServerError(
              s"Unexpected invoice item structure was returned from a Zuora preview call. Subscription name is $subscriptionName. Invoice data was: $invoice",
            ),
          )
      }
    }
}

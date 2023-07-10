package com.gu.productmove.move

import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.PreviewResult
import com.gu.productmove.zuora.GetSubscription.RatePlanCharge
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.endpoint.move.{SupporterPlusRatePlanIds, ProductSwitchRatePlanIds}
import com.gu.productmove.zuora.{SubscriptionUpdateInvoice, SubscriptionUpdateInvoiceItem}
import zio.{ZIO, Clock}
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{PreviewResult, InternalServerError, ErrorResponse}

object BuildPreviewResult {
  def isBelowMinimumStripeCharge(amount: BigDecimal): Boolean =
    amount > BigDecimal(0) && amount < BigDecimal(0.50)

  def getRefundInvoiceAmount(
      subscriptionName: SubscriptionName,
      invoice: SubscriptionUpdateInvoice,
      invoiceItems: List[SubscriptionUpdateInvoiceItem],
      activeRatePlanCharge: RatePlanCharge,
  ): ZIO[Any, InternalServerError, BigDecimal] =
    if (invoiceItems.isEmpty) {
      /*
          Term renewal for many subs happens during the billing run on the renewal day which is scheduled for around 6am BST.
          During this billing run, Zuora does not return the contribution invoice item, only supporter plus invoice items.
          When this happens we can just use the full price of the active rate plan as the amount to be refunded
       */
      for {
        _ <- ZIO.log(s"Entered edge case. Subscription name is $subscriptionName. Invoice data was: $invoice")
        priceDifference <- ZIO
          .fromOption(activeRatePlanCharge.price)
          .orElseFail(
            InternalServerError(
              s"Price is null on rate plan. Subscription name is $subscriptionName. Invoice data was: $invoice",
            ),
          )
      } yield BigDecimal.valueOf(priceDifference)
    } else {
      for {
        date <- Clock.currentDateTime.map(_.toLocalDate)
        invoice =
          invoiceItems
            .find(invoiceItem => invoiceItem.totalAmount <= 0 && invoiceItem.serviceStartDate == date)
      } yield invoice.head.totalAmount
    }

  def getSupporterPlusContributionAmount(
      invoiceItems: List[SubscriptionUpdateInvoiceItem],
  ): ZIO[Any, Nothing, BigDecimal] = for {
    date <- Clock.currentDateTime.map(_.toLocalDate)
    invoice = invoiceItems
      .find(invoiceItem => invoiceItem.totalAmount > 0 && invoiceItem.serviceStartDate == date)
  } yield invoice.map(_.totalAmount).getOrElse(0)

  def getSupporterPlusSubscriptionAmount(
      invoiceItems: List[SubscriptionUpdateInvoiceItem],
  ): ZIO[Any, Nothing, BigDecimal] = for {
    date <- Clock.currentDateTime.map(_.toLocalDate)
    invoice = invoiceItems
      .find(invoiceItem => invoiceItem.serviceStartDate == date)
  } yield invoice.map(_.totalAmount).get // Fail if no invoice is found

  def getPreviewResult(
      subscriptionName: SubscriptionName,
      activeRatePlanCharge: RatePlanCharge,
      invoice: SubscriptionUpdateInvoice,
      ids: ProductSwitchRatePlanIds,
  ): ZIO[Stage, ErrorResponse, PreviewResult] =
    Clock.currentDateTime.map(_.toLocalDate).flatMap { today =>
      val invoiceItems =
        invoice.invoiceItems.sortWith((i1, i2) => i1.serviceStartDate.isBefore(i2.serviceStartDate))

      val supporterPlusSubscriptionInvoiceItems = invoiceItems.filter(invoiceItem =>
        invoiceItem.productRatePlanChargeId == ids.supporterPlusRatePlanIds.subscriptionRatePlanChargeId,
      )
      val supporterPlusContributionInvoiceItems = invoiceItems.filter(invoiceItem =>
        invoiceItem.productRatePlanChargeId == ids.supporterPlusRatePlanIds.contributionRatePlanChargeId,
      )
      val contributionInvoiceItems = invoiceItems.filter(invoiceItem =>
        invoiceItem.productRatePlanChargeId == ids.recurringContributionRatePlanIds.ratePlanChargeId,
      )

      for {
        date <- Clock.currentDateTime.map(_.toLocalDate)
        refundAmount <- getRefundInvoiceAmount(
          subscriptionName,
          invoice,
          contributionInvoiceItems,
          activeRatePlanCharge,
        )
        contributionAmount <- getSupporterPlusContributionAmount(
          supporterPlusContributionInvoiceItems,
        )
        subscriptionAmount <- getSupporterPlusSubscriptionAmount(
          supporterPlusSubscriptionInvoiceItems,
        )
        totalSupporterPlusCost = subscriptionAmount + contributionAmount
        amountPayableToday = totalSupporterPlusCost - refundAmount.abs
      } yield PreviewResult(
        amountPayableToday,
        isBelowMinimumStripeCharge(amountPayableToday),
        refundAmount,
        totalSupporterPlusCost,
        supporterPlusSubscriptionInvoiceItems(1).serviceStartDate,
      )
    }
}

package com.gu.productmove.refund

import com.gu.productmove.*
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.TransactionError
import com.gu.productmove.invoicingapi.InvoicingApiRefund
import com.gu.productmove.zuora.*
import com.gu.productmove.zuora.model.SubscriptionName
import sttp.client3.SttpBackend
import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonDecoder, JsonEncoder}
import zio.{Task, ZIO}

import java.time.LocalDate

case class RefundInput(subscriptionName: SubscriptionName)

case class ChargeWithDiscount(charge: InvoiceItemWithTaxDetails, discount: Option[InvoiceItemWithTaxDetails])

object RefundInput {
  import SubscriptionName.*

  given JsonDecoder[RefundInput] = DeriveJsonDecoder.gen[RefundInput]

  given JsonEncoder[RefundInput] = DeriveJsonEncoder.gen[RefundInput]
}

object RefundSupporterPlus {
  def applyRefund(refundInput: RefundInput): ZIO[
    InvoicingApiRefund
      with CreditBalanceAdjustment
      with Stage
      with SttpBackend[Task, Any]
      with AwsS3
      with GetRefundInvoiceDetails
      with GetInvoice
      with InvoiceItemAdjustment,
    Throwable | TransactionError,
    Unit,
  ] = {

    for {
      _ <- ZIO.log(s"Getting invoice items for sub ${refundInput.subscriptionName}")
      refundInvoiceDetails <- GetRefundInvoiceDetails.get(refundInput.subscriptionName)
      _ <- ZIO.log(s"Amount to refund is ${refundInvoiceDetails.refundAmount}")
      _ <- InvoicingApiRefund.refund(
        refundInput.subscriptionName,
        refundInvoiceDetails.refundAmount,
      )
      _ <- ensureThatNegativeInvoiceBalanceIsZero(refundInvoiceDetails)
    } yield ()
  }

  private def ensureThatNegativeInvoiceBalanceIsZero(
      refundInvoiceDetails: RefundInvoiceDetails,
  ): ZIO[GetInvoice with InvoiceItemAdjustment, Throwable | TransactionError, Unit] = for {
    // unfortunately we can't get an invoice balance from the invoice items, it needs another request
    negativeInvoice <- GetInvoice.get(
      refundInvoiceDetails.negativeInvoiceId,
    )
    _ <-
      if (negativeInvoice.balance < 0) {
        adjustInvoiceBalanceToZero(refundInvoiceDetails, negativeInvoice.balance)
      } else {
        ZIO.log(s"Invoice with id ${refundInvoiceDetails.negativeInvoiceId} has zero balance")
      }
  } yield ()

  def checkInvoicesEqualBalance(balance: BigDecimal, invoiceItems: List[InvoiceItemWithTaxDetails]) = {
    val invoiceItemsTotal = invoiceItems.map(_.amountWithTax).sum
    if (balance.abs == invoiceItemsTotal.abs)
      ZIO.succeed(())
    else
      ZIO.fail(
        TransactionError(
          s"Invoice balance of $balance does not equal sum of invoice items $invoiceItemsTotal, with invoiceItems $invoiceItems",
        ),
      )
  }

  private def adjustInvoiceBalanceToZero(
      refundInvoiceDetails: RefundInvoiceDetails,
      negativeInvoiceBalance: BigDecimal,
  ): ZIO[InvoiceItemAdjustment, Throwable | TransactionError, Unit] =
    for {
      _ <- ZIO.log(
        s"Invoice with id ${refundInvoiceDetails.negativeInvoiceId} still has balance of $negativeInvoiceBalance",
      )
      _ <- checkInvoicesEqualBalance(negativeInvoiceBalance, refundInvoiceDetails.negativeInvoiceItems)
      invoiceItemAdjustments = buildInvoiceItemAdjustments(refundInvoiceDetails.negativeInvoiceItems)
      _ <- InvoiceItemAdjustment.batchUpdate(invoiceItemAdjustments)
      _ <- ZIO.log(
        s"Successfully applied invoice item adjustments $invoiceItemAdjustments" +
          s" to invoice ${refundInvoiceDetails.negativeInvoiceId}",
      )
    } yield ()

  def buildInvoiceItemAdjustments(
      invoiceItems: List[InvoiceItemWithTaxDetails],
  ): List[InvoiceItemAdjustment.PostBody] = {
    // If the invoice item has tax paid on it, this needs to be adjusted
    // in two separate adjustments,
    // - one for the charge where the SourceType is "InvoiceDetail" and SourceId is the invoice item id
    // - one for the tax where the SourceType is "Tax" and SourceId is the taxation item id
    // https://www.zuora.com/developer/api-references/older-api/operation/Object_POSTInvoiceItemAdjustment/#!path=SourceType&t=request

    // Charges will have a negative value because we are dealing with the negative invoice created by cancellation,
    // discounts will have a positive value. Unfortunately we can't just create an adjustment for each of the charges
    // and discounts as this takes the invoice to values which are not allowed by Zuora. Instead we need to subtract
    // the discount from the charge and create an adjustment for the difference.
    val (charges, discounts) = invoiceItems
      .filter(
        _.amountWithTax != 0,
      ) // Ignore any items with a zero amount, they will be the contribution charge where the user is just paying the base price
      .partition(_.amountWithTax < 0)

    val maybeDiscount = discounts.headOption
    val maybeDiscountedCharge =
      maybeDiscount.flatMap(discount => charges.find(charge => discount.AppliedToInvoiceItemId.contains(charge.Id)))

    val chargesWithDiscounts = charges
      .map(charge => ChargeWithDiscount(charge, if maybeDiscountedCharge.contains(charge) then maybeDiscount else None))

    chargesWithDiscounts.flatMap { chargeWithDiscount =>
      val discountChargeAmount = chargeWithDiscount.discount.map(_.ChargeAmount).getOrElse(BigDecimal(0))
      val discountTaxAmount = chargeWithDiscount.discount.map(_.taxAmount).getOrElse(BigDecimal(0))
      val chargeAdjustment =
        List(
          InvoiceItemAdjustment.PostBody(
            AdjustmentDate = chargeWithDiscount.charge.chargeDateAsDate,
            // ChargeAmount will be negative for charges and positive for discounts,
            // we need to invert this for the adjustments
            Amount = chargeWithDiscount.charge.ChargeAmount.abs - discountChargeAmount,
            InvoiceId = chargeWithDiscount.charge.InvoiceId,
            SourceId = chargeWithDiscount.charge.Id,
            SourceType = "InvoiceDetail",
          ),
        )
      val taxAdjustment = chargeWithDiscount.charge.TaxDetails match {
        case Some(taxDetails) =>
          List(
            InvoiceItemAdjustment.PostBody(
              AdjustmentDate = chargeWithDiscount.charge.chargeDateAsDate,
              // Tax amount will be negative for charges and positive for discounts,
              // we need to invert this for the adjustments
              Amount = taxDetails.amount.abs - discountTaxAmount,
              InvoiceId = chargeWithDiscount.charge.InvoiceId,
              SourceId = taxDetails.taxationId,
              SourceType = "Tax",
            ),
          )
        case None => Nil
      }

      chargeAdjustment ++ taxAdjustment
    }
  }
}

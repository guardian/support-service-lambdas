package com.gu.productmove.refund

import com.amazonaws.services.lambda.runtime.RequestHandler
import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.gu.productmove.{AwsCredentialsLive, AwsS3, AwsS3Live, GuStageLive, SQSLive, SttpClientLive}
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, OutputBody, Success, TransactionError}
import com.gu.productmove.framework.ZIOApiGatewayRequestHandler.TIO
import com.gu.productmove.invoicingapi.InvoicingApiRefund
import com.gu.productmove.zuora.{InvoiceItemWithTaxDetails}
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import com.gu.productmove.zuora.{
  CreditBalanceAdjustment,
  GetAccountLive,
  GetInvoice,
  GetInvoiceItemsForSubscription,
  GetSubscriptionLive,
  InvoiceItemAdjustment,
  InvoicesForRefund,
  SubscribeLive,
  ZuoraCancel,
  ZuoraCancelLive,
  ZuoraSetCancellationReason,
}
import sttp.capabilities.zio.ZioStreams
import sttp.client3.SttpBackend
import zio.{Clock, Task, ZIO}
import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonDecoder, JsonEncoder}

import java.time.{LocalDate, LocalDateTime}

case class RefundInput(subscriptionName: SubscriptionName)

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
      with GetInvoiceItemsForSubscription
      with GetInvoice
      with InvoiceItemAdjustment,
    ErrorResponse,
    Unit,
  ] = {

    for {
      _ <- ZIO.log(s"Getting invoice items for sub ${refundInput.subscriptionName}")
      invoicesForRefund <- GetInvoiceItemsForSubscription.get(refundInput.subscriptionName)
      _ <- ZIO.log(s"Amount to refund is ${invoicesForRefund.refundAmount}")
      _ <- InvoicingApiRefund.refund(
        refundInput.subscriptionName,
        invoicesForRefund.refundAmount,
      )
      _ <- ensureThatNegativeInvoiceBalanceIsZero(invoicesForRefund)
    } yield ()
  }

  private def ensureThatNegativeInvoiceBalanceIsZero(
      invoicesForRefund: InvoicesForRefund,
  ): ZIO[GetInvoice with InvoiceItemAdjustment, ErrorResponse, Unit] = for {
    // unfortunately we can't get an invoice balance from the invoice items, it needs another request
    negativeInvoice <- GetInvoice.get(
      invoicesForRefund.negativeInvoiceId,
    )
    _ <-
      if (negativeInvoice.balance < 0) {
        adjustInvoiceBalanceToZero(invoicesForRefund, negativeInvoice.balance)
      } else {
        ZIO.log(s"Invoice with id ${invoicesForRefund.negativeInvoiceId} has zero balance")
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
      invoicesForRefund: InvoicesForRefund,
      negativeInvoiceBalance: BigDecimal,
  ): ZIO[InvoiceItemAdjustment, ErrorResponse, Unit] =
    for {
      _ <- ZIO.log(
        s"Invoice with id ${invoicesForRefund.negativeInvoiceId} still has balance of $negativeInvoiceBalance",
      )
      _ <- checkInvoicesEqualBalance(negativeInvoiceBalance, invoicesForRefund.negativeInvoiceItems)
      today <- Clock.currentDateTime.map(_.toLocalDate)
      invoiceItemAdjustments = buildInvoiceItemAdjustments(today, invoicesForRefund.negativeInvoiceItems)
      _ <- InvoiceItemAdjustment.batchUpdate(invoiceItemAdjustments)
      _ <- ZIO.log(
        s"Successfully applied invoice item adjustments $invoiceItemAdjustments" +
          s" to invoice ${invoicesForRefund.negativeInvoiceId}",
      )
    } yield ()

  def buildInvoiceItemAdjustments(
      adjustmentDate: LocalDate,
      invoiceItems: List[InvoiceItemWithTaxDetails],
  ): List[InvoiceItemAdjustment.PostBody] = {
    // If the invoice item has tax paid on it, this needs to be adjusted
    // in two separate adjustments,
    // - one for the charge where the SourceType is "InvoiceDetail" and SourceId is the invoice item id
    // - one for the tax where the SourceType is "Tax" and SourceId is the taxation item id
    // https://www.zuora.com/developer/api-references/older-api/operation/Object_POSTInvoiceItemAdjustment/#!path=SourceType&t=request
    invoiceItems.filter(_.amountWithTax != 0).flatMap { invoiceItem =>
      val chargeAdjustment =
        List(
          InvoiceItemAdjustment.PostBody(
            AdjustmentDate = adjustmentDate,
            Amount = invoiceItem.ChargeAmount.abs,
            InvoiceId = invoiceItem.InvoiceId,
            SourceId = invoiceItem.Id,
            SourceType = "InvoiceDetail",
          ),
        )
      val taxAdjustment = invoiceItem.TaxDetails match
        case Some(taxDetails) =>
          List(
            InvoiceItemAdjustment.PostBody(
              AdjustmentDate = adjustmentDate,
              Amount = taxDetails.amount.abs,
              InvoiceId = invoiceItem.InvoiceId,
              SourceId = taxDetails.taxationId,
              SourceType = "Tax",
            ),
          )
        case None => Nil

      chargeAdjustment ++ taxAdjustment
    }
  }
}

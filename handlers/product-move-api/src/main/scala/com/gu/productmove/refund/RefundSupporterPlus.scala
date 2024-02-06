package com.gu.productmove.refund

import com.amazonaws.services.lambda.runtime.RequestHandler
import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.gu.productmove.{AwsCredentialsLive, AwsS3, AwsS3Live, GuStageLive, SQSLive, SttpClientLive}
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, OutputBody, Success, TransactionError}
import zio.{Clock, RIO, Task, ZIO}
import com.gu.productmove.invoicingapi.InvoicingApiRefund
import com.gu.productmove.zuora.InvoiceItemWithTaxDetails
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import com.gu.productmove.zuora.{
  CreditBalanceAdjustment,
  GetAccountLive,
  GetInvoice,
  GetRefundInvoiceDetails,
  GetSubscriptionLive,
  InvoiceItemAdjustment,
  RefundInvoiceDetails,
  SubscribeLive,
  ZuoraCancel,
  ZuoraCancelLive,
  ZuoraSetCancellationReason,
}
import sttp.capabilities.zio.ZioStreams
import sttp.client3.SttpBackend
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
    invoiceItems.filter(_.amountWithTax != 0).flatMap { invoiceItem =>
      val chargeAdjustment =
        List(
          InvoiceItemAdjustment.PostBody(
            AdjustmentDate = invoiceItem.chargeDateAsDate,
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
              AdjustmentDate = invoiceItem.chargeDateAsDate,
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

package com.gu.productmove.refund

import com.amazonaws.services.lambda.runtime.RequestHandler
import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.gu.productmove.{AwsCredentialsLive, AwsS3, AwsS3Live, GuStageLive, SQSLive, SttpClientLive}
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, OutputBody, Success, TransactionError}
import com.gu.productmove.framework.ZIOApiGatewayRequestHandler.TIO
import com.gu.productmove.invoicingapi.InvoicingApiRefund
import com.gu.productmove.zuora.GetInvoiceItemsForSubscription.{InvoiceItem, InvoiceItemsForSubscription}
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import com.gu.productmove.zuora.{
  CreditBalanceAdjustment,
  GetAccountLive,
  GetInvoice,
  GetInvoiceItemsForSubscription,
  GetSubscriptionLive,
  InvoiceItemAdjustment,
  SubscribeLive,
  ZuoraCancel,
  ZuoraCancelLive,
  ZuoraSetCancellationReason,
}
import sttp.capabilities.zio.ZioStreams
import sttp.client3.SttpBackend
import zio.{Task, ZIO}
import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonDecoder, JsonEncoder}

import java.time.LocalDateTime

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
      invoicesItemsForSub <- GetInvoiceItemsForSubscription.get(refundInput.subscriptionName)
      amount <- invoicesItemsForSub.lastPaidInvoiceAmount
      _ <- ZIO.log(s"Amount to refund is $amount")
      _ <- InvoicingApiRefund.refund(
        refundInput.subscriptionName,
        amount,
      )
      _ <- ensureThatNegativeInvoiceBalanceIsZero(invoicesItemsForSub)
    } yield ()
  }

  private def ensureThatNegativeInvoiceBalanceIsZero(
      invoiceItemsForSub: InvoiceItemsForSubscription,
  ): ZIO[GetInvoice with InvoiceItemAdjustment, ErrorResponse, Unit] = for {
    negativeInvoiceId <- invoiceItemsForSub.negativeInvoiceId
    // unfortunately we can't get an invoice balance from the invoice items, it needs another request
    negativeInvoice <- GetInvoice.get(
      negativeInvoiceId,
    )
    _ <-
      if (negativeInvoice.balance < 0) {
        adjustInvoiceBalanceToZero(negativeInvoiceId, invoiceItemsForSub, negativeInvoice.balance)
      } else {
        ZIO.log(s"Invoice with id $negativeInvoiceId has zero balance")
      }
  } yield ()

  private def checkInvoicesEqualBalance(balance: BigDecimal, invoiceItems: List[InvoiceItem]) = {
    val invoiceItemsTotal = invoiceItems.map(_.amountWithTax).sum
    if (balance.abs == invoiceItemsTotal.abs)
      ZIO.succeed(())
    else
      ZIO.fail(TransactionError(s"Invoice balance of $balance does not equal sum of invoice items $invoiceItemsTotal"))
  }

  private def adjustInvoiceBalanceToZero(
      negativeInvoiceId: String,
      invoiceItemsForSub: InvoiceItemsForSubscription,
      balance: BigDecimal,
  ): ZIO[InvoiceItemAdjustment, ErrorResponse, Unit] =
    for {
      _ <- ZIO.log(s"Invoice with id $negativeInvoiceId still has balance of $balance")
      invoiceItems <- invoiceItemsForSub.negativeInvoiceItems
      _ <- checkInvoicesEqualBalance(balance, invoiceItems)
      _ <- ZIO.foreachParDiscard(invoiceItems) { invoiceItem =>
        adjustInvoiceItem(
          negativeInvoiceId,
          invoiceItem,
          invoiceItem.amountWithTax.abs,
        )
      }
    } yield ()

  private def adjustInvoiceItem(
      negativeInvoiceId: String,
      invoiceItem: InvoiceItem,
      amountToRefund: BigDecimal,
  ): ZIO[InvoiceItemAdjustment, ErrorResponse, Unit] =
    for {
      _ <- InvoiceItemAdjustment.update(
        negativeInvoiceId,
        amountToRefund,
        invoiceItem.Id,
        "Charge",
      )
      _ <- ZIO.log(
        s"Successfully applied invoice item adjustment of $amountToRefund" +
          s" to invoice item ${invoiceItem.Id} of invoice $negativeInvoiceId",
      )
    } yield ()
}

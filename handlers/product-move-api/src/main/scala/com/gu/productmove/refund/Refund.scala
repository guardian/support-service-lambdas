package com.gu.productmove.refund

import com.amazonaws.services.lambda.runtime.RequestHandler
import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.gu.productmove.{AwsCredentialsLive, AwsS3, AwsS3Live, GuStageLive, SQSLive, SttpClientLive}
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpointTypes.{ExpectedInput, OutputBody, Success}
import com.gu.productmove.endpoint.cancel.zuora.GetSubscription
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ExpectedInput, OutputBody}
import com.gu.productmove.framework.ZIOApiGatewayRequestHandler.TIO
import com.gu.productmove.invoicingapi.InvoicingApiRefund
import com.gu.productmove.zuora.GetInvoiceItems.GetInvoiceItemsResponse
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import com.gu.productmove.zuora.{
  CreditBalanceAdjustment,
  GetAccountLive,
  GetInvoice,
  GetInvoiceItems,
  GetInvoiceToBeRefunded,
  GetSubscriptionLive,
  InvoiceItemAdjustment,
  SubscribeLive,
  ZuoraCancel,
  ZuoraCancelLive,
  ZuoraSetCancellationReason,
}
import sttp.client3.SttpBackend
import zio.{Task, ZIO}
import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonDecoder, JsonEncoder}

import java.time.LocalDateTime

case class RefundInput(subscriptionName: String, invoiceId: String, refundAmount: BigDecimal)

object RefundInput {
  given JsonDecoder[RefundInput] = DeriveJsonDecoder.gen[RefundInput]

  given JsonEncoder[RefundInput] = DeriveJsonEncoder.gen[RefundInput]
}

object Refund {
  def applyRefund(refundInput: RefundInput): ZIO[
    InvoicingApiRefund
      with CreditBalanceAdjustment
      with Stage
      with SttpBackend[Task, Any]
      with AwsS3
      with GetInvoiceToBeRefunded
      with GetInvoice
      with GetInvoiceItems
      with InvoiceItemAdjustment,
    String,
    Unit,
  ] = {

    for {
      invoicesForSub <- GetInvoiceToBeRefunded.get(refundInput.subscriptionName)
      amount = invoicesForSub.getLastPaidInvoiceAmount
      negativeInvoiceId = invoicesForSub.getNegativeInvoiceId

      _ <- InvoicingApiRefund.refund(
        refundInput.subscriptionName,
        amount,
      )
      _ <- ensureThatNegativeInvoiceBalanceIsZero(negativeInvoiceId)
    } yield ()
  }

  def ensureThatNegativeInvoiceBalanceIsZero(
      negativeInvoiceId: String,
  ): ZIO[GetInvoice with GetInvoiceItems with InvoiceItemAdjustment, String, Unit] = for {
    invoiceResponse <- GetInvoice.get(negativeInvoiceId)
    _ <-
      if (invoiceResponse.balance < 0) {
        adjustInvoiceBalanceToZero(negativeInvoiceId, invoiceResponse.balance)
      } else {
        ZIO.log(s"Invoice with id $negativeInvoiceId has zero balance")
      }
  } yield ()

  def getInvoiceItemId(invoiceItemsResponse: GetInvoiceItemsResponse) =
    invoiceItemsResponse.invoiceItems.headOption
      .map(_.id)
      .map(ZIO.succeed(_))
      .getOrElse(
        ZIO.fail(
          s"Empty list of invoice items in response $invoiceItemsResponse this is an error " +
            s"as we need the invoice item id in order to balance the negative (cancellation) invoice",
        ),
      )

  def adjustInvoiceBalanceToZero(
      invoiceId: String,
      balance: BigDecimal,
  ): ZIO[GetInvoiceItems with InvoiceItemAdjustment, String, Unit] =
    for {
      _ <- ZIO.log(s"Invoice with id $invoiceId still has balance of $balance")
      invoiceItems <- GetInvoiceItems.get(invoiceId)
      invoiceItemId <- getInvoiceItemId(invoiceItems)
      _ <- InvoiceItemAdjustment.update(invoiceId, balance.abs, invoiceItemId)
      _ <- ZIO.log(
        s"Successfully applied invoice item adjustment of $balance" +
          s" to invoice item $invoiceItemId of invoice $invoiceId",
      )
    } yield ()

}

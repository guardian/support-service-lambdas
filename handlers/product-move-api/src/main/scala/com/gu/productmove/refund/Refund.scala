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
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import com.gu.productmove.zuora.{
  CreditBalanceAdjustment,
  GetAccountLive,
  GetInvoiceToBeRefunded,
  GetSubscriptionLive,
  SubscribeLive,
  ZuoraCancel,
  ZuoraCancelLive,
  ZuoraSetCancellationReason,
}
import sttp.client3.SttpBackend
import zio.{Task, ZIO}
import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonDecoder, JsonEncoder}

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
      with GetInvoiceToBeRefunded,
    String,
    Unit,
  ] = {
    import refundInput.{subscriptionName, refundAmount, invoiceId}

    for {
      invoicesForSub <- GetInvoiceToBeRefunded.get(subscriptionName)
      amount = invoicesForSub.getLastPaidInvoiceAmount
      negativeInvoiceId = invoicesForSub.getNegativeInvoiceId // TODO: check it matches the one passed in

      _ <- ZIO.log(
        s"Amount to be refunded is $amount, input negative invoice id matches discovered id = ${negativeInvoiceId == invoiceId}",
      )
      res <- InvoicingApiRefund.refund(subscriptionName, amount, false)
      _ <- ZIO.log(s"Transfer $amount from negative invoice $negativeInvoiceId to the account balance")
      _ <- CreditBalanceAdjustment.adjust(
        amount,
        s"[Product-switching] Transfer $amount from negative invoice $negativeInvoiceId to the account balance",
        negativeInvoiceId,
        "Increase",
      )
      _ <- ZIO.log(s"Transfer $amount from credit balance to invoice ${res.invoiceId}")
      _ <- CreditBalanceAdjustment.adjust(
        amount,
        s"[Product-switching] Transfer $amount from credit balance to invoice ${res.invoiceId}",
        res.invoiceId,
        "Decrease",
      )

// original main
//      _ <- CreditBalanceAdjustment.adjust(
//        refundAmount,
//        s"[Product-switching] Transfer $refundAmount from negative invoice $invoiceId to the account balance",
//        invoiceId,
//        "Increase",
//      )
//      _ <- CreditBalanceAdjustment.adjust(
//        refundAmount,
//        s"[Product-switching] Transfer $refundAmount from credit balance to invoice ${res.invoiceId}",
//        res.invoiceId,
//        "Decrease",
//      )
    } yield ()
  }

}

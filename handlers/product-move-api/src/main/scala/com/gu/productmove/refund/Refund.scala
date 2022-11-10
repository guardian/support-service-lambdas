package com.gu.productmove.refund

import com.amazonaws.services.lambda.runtime.RequestHandler
import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpointTypes.{ExpectedInput, OutputBody, Success}
import com.gu.productmove.endpoint.cancel.zuora.GetSubscription
import com.gu.productmove.invoicingapi.InvoicingApiRefund
import com.gu.productmove.zuora.{CreditBalanceAdjustment, ZuoraCancel, ZuoraSetCancellationReason}
import sttp.client3.SttpBackend
import zio.{Task, ZIO}

case class RefundInput(subscriptionName: String, invoiceId: String, refundAmount: Double)

object Refund {
  private def applyRefund(refundInput: RefundInput): ZIO[InvoicingApiRefund with CreditBalanceAdjustment with Stage with SttpBackend[Task, Any] with AwsS3, String, OutputBody] = {
    import refundInput.{subscriptionName, refundAmount, invoiceId}

    for {
      res <- InvoicingApiRefund.refund(subscriptionName, refundAmount, false)
      _ <- CreditBalanceAdjustment.adjust(refundAmount, s"[Product-switching] Transfer $refundAmount from negative invoice $invoiceId to the account balance", invoiceId, "Increase")
      _ <- CreditBalanceAdjustment.adjust(refundAmount, s"[Product-switching] Transfer $refundAmount from credit balance to invoice ${res.invoiceId}", res.invoiceId, "Decrease")
    } yield Success("")
  }
}

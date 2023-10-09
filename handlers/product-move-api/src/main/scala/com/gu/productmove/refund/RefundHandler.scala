package com.gu.productmove.refund

import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.amazonaws.services.lambda.runtime.events.SQSEvent.SQSMessage
import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.gu.productmove.SecretsLive
import com.gu.productmove.invoicingapi.InvoicingApiRefundLive
import com.gu.productmove.refund.*
import com.gu.productmove.zuora.{
  CreditBalanceAdjustmentLive,
  GetInvoiceLive,
  GetRefundInvoiceDetails,
  GetRefundInvoiceDetailsLive,
  InvoiceItemAdjustment,
  InvoiceItemAdjustmentLive,
}
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import com.gu.productmove.{AwsCredentialsLive, AwsS3Live, GuStageLive, SttpClientLive}
import zio.json.*
import zio.{Exit, Runtime, Unsafe, ZIO}

import scala.jdk.CollectionConverters.*

class RefundHandler extends RequestHandler[SQSEvent, Unit] {

  override def handleRequest(input: SQSEvent, context: Context): Unit = {
    val records: List[SQSEvent.SQSMessage] = input.getRecords.asScala.toList

    records.foreach { record =>
      val maybeRefundInput = record.getBody.fromJson[RefundInput]

      maybeRefundInput match {
        case Right(refundInput) => runZio(refundInput, context)
        case Left(ex) =>
          context.getLogger.log(s"Error '$ex' when decoding JSON to RefundInput with body: ${record.getBody}")
      }
    }
  }

  def runZio(refundInput: RefundInput, context: Context) =
    val runtime = Runtime.default
    Unsafe.unsafe { implicit u =>
      runtime.unsafe.run(
        RefundSupporterPlus
          .applyRefund(refundInput)
          .provide(
            AwsS3Live.layer,
            AwsCredentialsLive.layer,
            SttpClientLive.layer,
            ZuoraClientLive.layer,
            ZuoraGetLive.layer,
            GuStageLive.layer,
            InvoicingApiRefundLive.layer,
            CreditBalanceAdjustmentLive.layer,
            GetRefundInvoiceDetailsLive.layer,
            GetInvoiceLive.layer,
            InvoiceItemAdjustmentLive.layer,
            SecretsLive.layer,
          ),
      ) match
        case Exit.Success(value) => value
        case Exit.Failure(cause) =>
          context.getLogger.log("Failed with: " + cause.toString)
          throw new RuntimeException("Refund failed with error: " + cause.toString)
    }
}

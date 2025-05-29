package com.gu.productmove.refund

import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.amazonaws.services.lambda.runtime.events.SQSEvent.SQSMessage
import com.amazonaws.services.lambda.runtime.{Context, LambdaRuntime, RequestHandler}
import com.gu.productmove.invoicingapi.InvoicingApiRefundLive
import com.gu.productmove.refund.*
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}
import com.gu.productmove.zuora.*
import com.gu.productmove.*
import zio.json.*
import zio.{Exit, Runtime, Unsafe, ZIO}

import java.io.{OutputStream, PrintStream}
import scala.jdk.CollectionConverters.*

class RefundHandler extends RequestHandler[SQSEvent, Unit] {

  val printStream = new PrintStream(new OutputStream() {
    override def write(b: Int): Unit =
      LambdaRuntime.getLogger.log(Array(b.toByte))

    override def write(b: Array[Byte]): Unit =
      LambdaRuntime.getLogger.log(b)

    override def write(b: Array[Byte], off: Int, len: Int): Unit =
      LambdaRuntime.getLogger.log(b.slice(off, off + len))
  })

  override def handleRequest(input: SQSEvent, context: Context): Unit = {

    // try to avoid the logs getting split up too much
    System.setOut(printStream)
    System.setErr(printStream)

    val records: List[SQSEvent.SQSMessage] = input.getRecords.asScala.toList

    records.foreach { record =>
      val body = record.getBody
      context.getLogger.log("Processing SQS record:\n" + body)
      val maybeRefundInput = body.fromJson[RefundInput]

      maybeRefundInput match {
        case Right(refundInput) => runZio(refundInput, context)
        case Left(ex) =>
          context.getLogger.log(s"Error '$ex' when decoding JSON to RefundInput with body: $body")
      }
    }
  }

  def runZio(refundInput: RefundInput, context: Context) = {
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
            InvoiceItemQueryLive.layer,
            GetInvoiceLive.layer,
            InvoiceItemAdjustmentLive.layer,
            SecretsLive.layer,
            RunBillingLive.layer,
            PostInvoicesLive.layer,
          ),
      ) match {
        case Exit.Success(value) => value
        case Exit.Failure(cause) =>
          context.getLogger.log("Failed with: " + cause.toString)
          throw new RuntimeException("Refund failed with error: " + cause.toString)
      }
    }
  }
}

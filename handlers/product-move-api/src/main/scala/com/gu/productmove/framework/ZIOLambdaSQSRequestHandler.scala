package com.gu.productmove.framework

import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.amazonaws.services.lambda.runtime.events.SQSEvent.SQSMessage
import com.gu.productmove.{AwsCredentialsLive, AwsS3Live, GuStageLive, SttpClientLive}
import com.gu.productmove.invoicingapi.InvoicingApiRefundLive
import com.gu.productmove.refund.*
import com.gu.productmove.zuora.CreditBalanceAdjustmentLive
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGetLive}

import scala.jdk.CollectionConverters.*
import zio.{Exit, Runtime, Unsafe, ZIO}
import zio.json.*

object ZIOLambdaSQSRequestHandler {
  type TIO[+A] = ZIO[Any, Any, A] // Succeed with an `A`, may fail with anything`, no requirements.
}

class ZIOLambdaSQSRequestHandler extends RequestHandler[SQSEvent, Unit] {

  override def handleRequest(input: SQSEvent, context: Context): Unit = {
    val records: List[SQSEvent.SQSMessage] = input.getRecords.asScala.toList

    records.map { record =>
      val maybeRefundInput = record.getBody.fromJson[RefundInput]

      maybeRefundInput match {
        case Right(refundInput) => runZio(refundInput, context)
        case _ => ()
          // SafeLogger.warn(s"Couldn't decode JSON to RefundInput with body: ${maybeRefundInput.getBody}")
      }
    }
  }

  def runZio(refundInput: RefundInput, context: Context) =
    val runtime = Runtime.default
    Unsafe.unsafe {
      runtime.unsafe.run(
        Refund.applyRefund(refundInput)
          .provide(
            // Runtime.addLogger(new AwsLambdaLogger(context.getLogger)),
            AwsS3Live.layer,
            AwsCredentialsLive.layer,
            SttpClientLive.layer,
            ZuoraClientLive.layer,
            ZuoraGetLive.layer,
            GuStageLive.layer,
            InvoicingApiRefundLive.layer,
            CreditBalanceAdjustmentLive.layer
          )
      ) match
        case Exit.Success(value) => value
        case Exit.Failure(cause) => context.getLogger.log("Failed with: " + cause.toString)
    }
}

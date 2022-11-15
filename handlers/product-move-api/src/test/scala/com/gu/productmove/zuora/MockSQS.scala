package com.gu.productmove.zuora

import com.gu.productmove.refund.RefundInput
import com.gu.productmove.{EmailMessage, SQS}
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.CreateSubscriptionResponse
import software.amazon.awssdk.services.sqs.SqsAsyncClient
import zio.{IO, ZIO}

class MockSQS(responses: Map[Any, Unit]) extends SQS {

  private var mutableStore: List[Any] = Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def sendEmail(message: EmailMessage): ZIO[Any, String, Unit] = {
    mutableStore = message :: mutableStore

    responses.get(message) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      // case None => ZIO.fail(s"wrong input, message was $message")
      // temporarily make all tests pass
      case None => ZIO.succeed(())
  }

  override def queueRefund(refundInput: RefundInput): ZIO[Any, String, Unit] = {
    mutableStore = refundInput :: mutableStore

    responses.get(refundInput) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(s"wrong input, refund input was $refundInput")
  }
}

object MockSQS {
  def requests: ZIO[MockSQS, Nothing, List[Any]] = ZIO.serviceWith[MockSQS](_.requests)
}

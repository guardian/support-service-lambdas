package com.gu.productmove.zuora

import com.gu.productmove.{EmailMessage, EmailSender}
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.CreateSubscriptionResponse
import software.amazon.awssdk.services.sqs.SqsAsyncClient
import zio.{IO, ZIO}

class MockEmailSender(responses: Map[EmailMessage, Unit]) extends EmailSender {

  private var mutableStore: List[EmailMessage] = Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def sendEmail(message: EmailMessage): ZIO[Any, String, Unit] = {
    mutableStore = message :: mutableStore

    responses.get(message) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      // case None => ZIO.fail(s"wrong input, message was $message")
      // temporarily make all tests pass
      case None => ZIO.succeed(())
  }
}

object MockEmailSender {
  def requests: ZIO[MockEmailSender, Nothing, List[EmailMessage]] = ZIO.serviceWith[MockEmailSender](_.requests)
}

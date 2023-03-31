package com.gu.productmove.zuora

import com.gu.productmove.refund.RefundInput
import com.gu.productmove.salesforce.Salesforce.SalesforceRecordInput
import com.gu.productmove.{EmailMessage, SQS}
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.CreateSubscriptionResponse
import software.amazon.awssdk.services.sqs.SqsAsyncClient
import zio.{IO, ZIO}

import scala.collection.mutable.ArrayBuffer

class MockSQS(responses: Map[EmailMessage | RefundInput | SalesforceRecordInput, Unit]) extends SQS {
  val requests: ArrayBuffer[EmailMessage | RefundInput | SalesforceRecordInput] =
    ArrayBuffer.empty // we need to remember the side effects

  def addRequest(request: EmailMessage | RefundInput | SalesforceRecordInput): Unit =
    requests += request

  override def sendEmail(message: EmailMessage): ZIO[Any, String, Unit] = {
    addRequest(message)

    responses.get(message) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(s"MockSQS: Not stubbed for message: $message")
  }

  override def queueRefund(refundInput: RefundInput): ZIO[Any, String, Unit] = {
    addRequest(refundInput)

    responses.get(refundInput) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(s"wrong input, refund input was $refundInput")
  }

  override def queueSalesforceTracking(salesforceRecordInput: SalesforceRecordInput): ZIO[Any, String, Unit] = {
    addRequest(salesforceRecordInput)

    responses.get(salesforceRecordInput) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(s"wrong input, salesforce record input was $salesforceRecordInput")
  }
}

object MockSQS {
  def requests: ZIO[MockSQS, Nothing, List[EmailMessage | RefundInput | SalesforceRecordInput]] =
    ZIO.serviceWith[MockSQS](_.requests.toList)
}

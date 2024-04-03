package com.gu.productmove.zuora

import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
import com.gu.productmove.refund.{RefundInput,InvoicingApiRefundInput}
import com.gu.productmove.salesforce.Salesforce.SalesforceRecordInput
import com.gu.productmove.{EmailMessage, SQS}
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.CreateSubscriptionResponse
import software.amazon.awssdk.services.sqs.SqsAsyncClient
import zio.{IO, ZIO}

import scala.collection.mutable.ArrayBuffer

class MockSQS(responses: Map[EmailMessage | RefundInput | InvoicingApiRefundInput | SalesforceRecordInput, Unit]) extends SQS {
  val requests: ArrayBuffer[EmailMessage | RefundInput | InvoicingApiRefundInput | SalesforceRecordInput] =
    ArrayBuffer.empty // we need to remember the side effects

  def addRequest(request: EmailMessage | RefundInput | InvoicingApiRefundInput | SalesforceRecordInput): Unit =
    requests += request

  override def sendEmail(message: EmailMessage): ZIO[Any, ErrorResponse, Unit] = {
    addRequest(message)

    responses.get(message) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(InternalServerError(s"MockSQS: Not stubbed for message: $message"))
  }

  override def queueRefund(refundInput: RefundInput): ZIO[Any, ErrorResponse, Unit] = {
    addRequest(refundInput)

    responses.get(refundInput) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(InternalServerError(s"wrong input, refund input was $refundInput"))
  }

  override def queueInvoicingApiRefund(invoicingApiRefundInput: InvoicingApiRefundInput): ZIO[Any, ErrorResponse, Unit] = {
    addRequest(invoicingApiRefundInput)

    responses.get(invoicingApiRefundInput) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(InternalServerError(s"wrong input, refund input was $invoicingApiRefundInput"))
  }
  override def queueSalesforceTracking(salesforceRecordInput: SalesforceRecordInput): ZIO[Any, ErrorResponse, Unit] = {
    addRequest(salesforceRecordInput)

    responses.get(salesforceRecordInput) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(InternalServerError(s"wrong input, salesforce record input was $salesforceRecordInput"))
  }
}

object MockSQS {
  def requests: ZIO[MockSQS, Nothing, List[EmailMessage | RefundInput |InvoicingApiRefundInput | SalesforceRecordInput]] =
    ZIO.serviceWith[MockSQS](_.requests.toList)
}

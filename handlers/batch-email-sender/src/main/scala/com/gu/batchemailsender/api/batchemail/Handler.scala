package com.gu.batchemailsender.api.batchemail

import com.amazonaws.services.lambda.runtime.Context
import com.gu.batchemailsender.api.batchemail.SalesforceMessage.SalesforceBatchWithExceptions
import com.gu.effects.sqs.AwsSQSSend.{EmailQueueName, Payload, QueueName}
import com.gu.effects.sqs.{AwsSQSSend, SqsSync}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.reader.Types._
import play.api.libs.json.Json

import java.io.{InputStream, OutputStream}
import scala.util.{Failure, Success}

case class OldPartialSendSuccess(message: String, code: Int, failed_item_ids: List[String])

object OldPartialSendSuccess {
  implicit val failureResponseWrites = Json.writes[OldPartialSendSuccess]
}

case class PartialSendSuccess(message: String, code: Int)

object PartialSendSuccess {
  implicit val failureResponseWrites = Json.writes[PartialSendSuccess]
}

// FIXME: What should be the behaviour with some/all items having parsing errors?
object Handler extends Logging {
  lazy val queueName = EmailQueueName
  lazy val sqsClient = SqsSync.buildClient
  lazy val sendBatch = new SendEmailBatchToSqs(queueName, sqsClient)
  lazy val handleEmailBatchRequest = new HandleEmailBatchRequest(sendBatch)

  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context))(
      ContinueProcessing(Operation.noHealthcheck(steps = handle))
    )
  }

  private def handle(apiGatewayRequest: ApiGatewayRequest): ApiResponse = {
    val useOldSend = apiGatewayRequest.queryStringParameters.flatMap(_.get("oldApi")).map(_.toBoolean).getOrElse(false)
    if (useOldSend) {
      apiGatewayRequest
        .bodyAsCaseClass[SalesforceBatchWithExceptions]()
        .map({ salesforceBatch =>
          val validSalesforceBatchItems = salesforceBatch.validBatch.batch_items
          val invalidSalesforceBatchItems = salesforceBatch.exceptions
          if (invalidSalesforceBatchItems.nonEmpty) { // FIXME: This is not hooked up to a response code which means emails might be silently dropped
            logger.error(
              s"Some batch items sent from Salesforce had parsing errors: $invalidSalesforceBatchItems. FIXME: These emails are silently dropped!",
            )
          }
          val sqsMessages = validSalesforceBatchItems.map(BrazeSqsMessage.fromSalesforceMessage)
          val sqsSendResults = oldSend(sqsMessages)
          val failedSendIds = sqsSendResults collect { case Left(recordId) => recordId }
          val successfulIds = sqsSendResults collect { case Right(recordId) => recordId }
          if (failedSendIds.nonEmpty) {
            logger.error(s"Failed to send some Braze SQS messages: $failedSendIds")
            ApiGatewayResponse(
              "502",
              OldPartialSendSuccess("Failed to send some Braze SQS messages.", 502, failedSendIds),
            )
          } else {
            logger.info(s"Successfully sent all Braze SQS messages: $successfulIds")
            ApiGatewayResponse.successfulExecution
          }
        })
        .apiResponse
    } else {
      handleEmailBatchRequest(apiGatewayRequest)
    }
  }

  private def oldSend(brazeMessages: List[BrazeSqsMessage]): List[Either[String, String]] = {
    val oldSend = SqsSync.send(sqsClient)(queueName) _
    brazeMessages.map { msg =>
      val payloadString = Json.prettyPrint(Json.toJson(msg))
      oldSend(Payload(payloadString)) match {
        case Success(_) => Right(msg.recordId)
        case Failure(_) => Left(msg.recordId)
      }
    }
  }
}

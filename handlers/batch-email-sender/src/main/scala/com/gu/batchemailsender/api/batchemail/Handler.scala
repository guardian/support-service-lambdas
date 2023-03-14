package com.gu.batchemailsender.api.batchemail

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.batchemailsender.api.batchemail.SalesforceMessage.SalesforceBatchWithExceptions
import com.gu.effects.RawEffects
import com.gu.effects.sqs.AwsSQSSend.{Payload, QueueName}
import com.gu.effects.sqs.SqsSync
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.reader.Types._
import play.api.libs.json.Json

import scala.util.{Failure, Success}

case class PartialSendSuccess(message: String, code: Int, failed_item_ids: List[String])

object PartialSendSuccess {
  implicit val failureResponseWrites = Json.writes[PartialSendSuccess]
}

// FIXME: What should be the behaviour with some/all items having parsing errors?
object Handler extends Logging {
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context)) {
      def operation(apiGatewayRequest: ApiGatewayRequest): ApiResponse = {
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
            val sqsSendResults = send(sqsMessages)
            val failedSendIds = sqsSendResults collect { case Left(recordId) => recordId }
            val successfulIds = sqsSendResults collect { case Right(recordId) => recordId }
            if (failedSendIds.nonEmpty) {
              logger.error(s"Failed to send some Braze SQS messages: $failedSendIds")
              ApiGatewayResponse(
                "502",
                PartialSendSuccess("Failed to send some Braze SQS messages.", 502, failedSendIds),
              )
            } else {
              logger.info(s"Successfully sent all Braze SQS messages: $successfulIds")
              ApiGatewayResponse.successfulExecution
            }
          })
          .apiResponse
      }

      ContinueProcessing(Operation.noHealthcheck(steps = operation))
    }
  }

  private def send(brazeMessages: List[BrazeSqsMessage]): List[Either[String, String]] = {
    val queueName =
      if (RawEffects.stage.isProd) QueueName("braze-emails-PROD") else QueueName("braze-emails-CODE")
    val send = SqsSync.send(SqsSync.buildClient)(queueName) _
    brazeMessages.map { msg =>
      val payloadString = Json.prettyPrint(Json.toJson(msg))
      send(Payload(payloadString)) match {
        case Success(_) => Right(msg.recordId)
        case Failure(_) => Left(msg.recordId)
      }
    }
  }
}

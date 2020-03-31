package com.gu.batchemailsender.api.batchemail

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import SalesforceMessage.SalesforceBatchWithExceptions
import com.gu.effects.RawEffects
import com.gu.effects.sqs.AwsSQSSend
import com.gu.effects.sqs.AwsSQSSend.{Payload, QueueName}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.reader.Types._
import play.api.libs.json.Json

import scala.util.{Failure, Success, Try}

object Handler extends Logging {
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context)) {
      def operation(apiGatewayRequest: ApiGatewayRequest): ApiResponse = {
        apiGatewayRequest.bodyAsCaseClass[SalesforceBatchWithExceptions]().map({ salesforceBatch =>
          if (salesforceBatch.exceptions.nonEmpty) {
            logger.error(s"There were parsing errors in the body received: ${salesforceBatch.exceptions}")
          }
          val brazeSqsMessages = salesforceBatch.validBatch.batch_items.map(BrazeSqsMessage.fromSalesforceMessage)
          send(brazeSqsMessages) match {
            case Nil => ApiGatewayResponse.successfulExecution
            case idList => ApiGatewayResponse.internalServerError(s"Failed send the following messages $idList")
          }
        }).apiResponse
      }

      ContinueProcessing(Operation.noHealthcheck(steps = operation))
    }
  }

  private def send(brazeMessages: List[BrazeSqsMessage]): List[String] = {
    val queueName = if (RawEffects.stage.isProd) QueueName("contributions-thanks") else QueueName("contributions-thanks-dev")
    brazeMessages flatMap { msg =>
      val payloadString = Json.prettyPrint(Json.toJson(msg))
      AwsSQSSend.sendSync(queueName)(Payload(payloadString)) match {
        case Success(_) => None
        case Failure(_) => Some(msg.recordId)
      }
    }
  }
}

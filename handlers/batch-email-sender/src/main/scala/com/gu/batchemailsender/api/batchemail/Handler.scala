package com.gu.batchemailsender.api.batchemail

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.batchemailsender.api.batchemail.model.{EmailBatch, EmailBatchItemId, EmailBatchSenderResponses}
import com.gu.effects.sqs.AwsSQSSend
import com.gu.effects.sqs.AwsSQSSend.{Payload, QueueName}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.reader.Types._

import scala.util.Try

object Handler extends Logging {

  def operationWithEffects(sqsSend: Payload => Try[Unit]) = {

    def operation(apiGatewayRequest: ApiGatewayRequest) = {
      val apiGatewayOp = apiGatewayRequest.bodyAsCaseClass[EmailBatch](Some(EmailBatchSenderResponses.badRequest)) map { emailBatch: EmailBatch =>
        SqsSendBatch.sendBatchSync(sqsSend)(emailBatch.emailBatchItems) match {
          case Nil => ApiGatewayResponse.successfulExecution
          case idList => EmailBatchSenderResponses.someItemsFailed(idList.map(_.value).toList)
        }
      }
      apiGatewayOp.apiResponse
    }

    ContinueProcessing(Operation.noHealthcheck(steps = operation))
  }

  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    val sqsfunction: Payload => Try[Unit] = AwsSQSSend.sendSync(QueueName("contributions-thanks-dev"))
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context))(operationWithEffects(sqsfunction))
  }


}

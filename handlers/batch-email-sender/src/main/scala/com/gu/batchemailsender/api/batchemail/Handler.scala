package com.gu.batchemailsender.api.batchemail

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.batchemailsender.api.batchemail.model.EmailBatch.WireModel.WireEmailBatchWithExceptions
import com.gu.batchemailsender.api.batchemail.model.{EmailBatch, EmailBatchSenderResponses}
import com.gu.effects.RawEffects
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

  def operationWithEffects(sqsSend: Payload => Try[Unit]): ApiGatewayOp[Operation] = {

    def operation(apiGatewayRequest: ApiGatewayRequest): ApiResponse = {

      val apiGatewayOp: ApiGatewayOp[ApiResponse] = apiGatewayRequest.bodyAsCaseClass[WireEmailBatchWithExceptions]() map { emailBatch: WireEmailBatchWithExceptions =>
        if (emailBatch.exceptions.nonEmpty) {
          logger.error(s"There were parsing errors in the body received: ${emailBatch.exceptions}")
        }
        val batch = EmailBatch.WireModel.fromWire(emailBatch.validBatch)
        SqsSendBatch.sendBatchSync(sqsSend)(batch.emailBatchItems) match {
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

    val queueName = if (RawEffects.stage.isProd) QueueName("contributions-thanks") else QueueName("contributions-thanks-dev")

    val sqsfunction: Payload => Try[Unit] = AwsSQSSend.sendSync(queueName)

    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context))(operationWithEffects(sqsfunction))
  }

}

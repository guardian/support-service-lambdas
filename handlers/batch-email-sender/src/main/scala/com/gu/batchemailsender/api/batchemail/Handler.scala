package com.gu.batchemailsender.api.batchemail

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.batchemailsender.api.batchemail.model.{EmailBatch, EmailBatchItemId}
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
      val what: ApiGatewayOp[ApiResponse] = apiGatewayRequest.bodyAsCaseClass[EmailBatch]() map { emailBatch =>
        SqsSendBatch.sendBatchSync(sqsSend)(emailBatch.emailBatchItems)
        ApiGatewayResponse.successfulExecution
      }

      what.apiResponse

      //      val what2: ApiGatewayOp[Nothing] = (for {
      //        requestBody <- apiGatewayRequest.bodyAsCaseClass[EmailBatch]()
      //        failedIds <- SqsSendBatch.sendBatchSync(sqsSend)(requestBody.emailBatchItems)
      //      } yield failedIds)
      //        what2.apiResponse
    }

    ContinueProcessing(Operation.noHealthcheck(steps = operation))
  }

  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    val sqsfunction: Payload => Try[Unit] = AwsSQSSend.sendSync(QueueName("contributions-thanks-dev"))
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context))(operationWithEffects(sqsfunction))
  }

  //    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context)) {
  //      ContinueProcessing(
  //        Operation.noHealthcheck {
  //          req: ApiGatewayRequest =>
  //            {
  //
  //              val blah: Types.ApiGatewayOp[EmailBatch] = for {
  //                requestBody <- req.bodyAsCaseClass[EmailBatch]()
  //              } yield requestBody
  //                blah
  //
  //                ApiGatewayResponse.messageResponse("200", "hello")
  //
  //            }
  //        }
  //      )
  //    }

}

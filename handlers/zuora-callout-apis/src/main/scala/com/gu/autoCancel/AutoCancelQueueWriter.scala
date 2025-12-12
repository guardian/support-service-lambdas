package com.gu.autoCancel

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.sqs.AwsSQSSend.{Payload, QueueName}
import com.gu.effects.sqs.SqsSync
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.apigateway.Auth.TrustedApiConfig
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse, Auth}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config._
import com.gu.util.reader.Types._

import java.io.{InputStream, OutputStream}
import scala.util.{Failure, Success, Try}

/** This handler receives auto-cancel callouts from Zuora via API Gateway and writes them to an SQS queue. This
  * decouples the API response from the actual processing, allowing us to control the rate at which we call Zuora APIs
  * by limiting the concurrency of the queue processor lambda.
  */
object AutoCancelQueueWriter extends Logging {

  case class AutoCancelQueueName(value: String) extends AnyVal

  lazy val AutoCancelQueue: QueueName = QueueName(
    sys.env.getOrElse("AutoCancelQueueName", "zuora-auto-cancel-queue-CODE"),
  )

  def operationForEffects(
      stage: Stage,
      fetchString: StringFromS3,
      sqsSend: QueueName => Payload => Try[Unit],
  ): ApiGatewayOp[ApiGatewayHandler.Operation] = {
    val loadConfigModule = LoadConfigModule(stage, fetchString)
    val trustedApiConfig = loadConfigModule.load[TrustedApiConfig]
    ApiGatewayOp.ContinueProcessing {
      ApiGatewayHandler.Operation.noHealthcheck { apiGatewayRequest: ApiGatewayRequest =>
        (for {
          _ <- Auth(trustedApiConfig)(apiGatewayRequest)
          body <- apiGatewayRequest.body
            .map(ApiGatewayOp.ContinueProcessing(_))
            .getOrElse(ApiGatewayOp.ReturnWithResponse(ApiGatewayResponse.badRequest("Missing request body")))
          // Validate that the body is valid JSON and contains required fields
          _ <- apiGatewayRequest.bodyAsCaseClass[AutoCancelCallout]()
          // Write the raw body to SQS for processing
          _ <- writeToQueue(sqsSend, body)
        } yield ApiGatewayResponse.successfulExecution).apiResponse
      }
    }
  }

  private def writeToQueue(
      sqsSend: QueueName => Payload => Try[Unit],
      body: String,
  ): ApiGatewayOp[Unit] = {
    logger.info(s"Writing auto-cancel request to SQS queue: ${AutoCancelQueue.value}")
    sqsSend(AutoCancelQueue)(Payload(body)) match {
      case Success(_) =>
        logger.info("Successfully wrote message to SQS queue")
        ApiGatewayOp.ContinueProcessing(())
      case Failure(exception) =>
        logger.error(s"Failed to write message to SQS queue: ${exception.getMessage}", exception)
        ApiGatewayOp.ReturnWithResponse(
          ApiGatewayResponse.internalServerError(s"Failed to queue request: ${exception.getMessage}"),
        )
    }
  }

  // Entry point referenced by CloudFormation
  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context)) {
      operationForEffects(
        RawEffects.stage,
        GetFromS3.fetchString,
        SqsSync.send(SqsSync.buildClient),
      )
    }
}

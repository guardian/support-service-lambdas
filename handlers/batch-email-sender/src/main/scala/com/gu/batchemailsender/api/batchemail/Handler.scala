package com.gu.batchemailsender.api.batchemail

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.sqs.AwsSQSSend.EmailQueueName
import com.gu.effects.sqs.SqsSync
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing

import java.io.{InputStream, OutputStream}

object Handler extends Logging {
  lazy val queueName = EmailQueueName
  lazy val sqsClient = SqsSync.buildClient
  lazy val sendBatch = new SendEmailBatchToSqs(queueName, sqsClient)
  lazy val handleEmailBatchRequest = new HandleEmailBatchRequest(sendBatch)

  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context))(
      ContinueProcessing(Operation.noHealthcheck(steps = handleEmailBatchRequest(_)))
    )
  }
}

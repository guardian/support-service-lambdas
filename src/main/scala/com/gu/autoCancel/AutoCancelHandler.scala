package com.gu.autoCancel

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.autoCancel.AutoCancelSteps.AutoCancelStepsDeps
import com.gu.effects.RawEffects
import com.gu.stripeCustomerSourceUpdated.SourceUpdatedSteps.StepsConfig
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest}
import com.gu.util.reader.Types.FailableOp
import com.gu.util.{Config, Logging}

object AutoCancelHandler extends App with Logging {

  def runWithEffects(rawEffects: RawEffects, lambdaIO: LambdaIO): Unit = {
    def operation(config: Config[StepsConfig]): ApiGatewayRequest => FailableOp[Unit] =
      AutoCancelSteps(AutoCancelStepsDeps.default(rawEffects.now(), rawEffects.response, config))
    ApiGatewayHandler.default[StepsConfig](operation, lambdaIO).run((rawEffects.stage, rawEffects.s3Load(rawEffects.stage)))
  }

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(RawEffects.createDefault, LambdaIO(inputStream, outputStream, context))

}

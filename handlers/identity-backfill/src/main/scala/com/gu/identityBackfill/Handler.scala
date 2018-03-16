package com.gu.identityBackfill

import java.io.{ InputStream, OutputStream }

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.identityBackfill.IdentityBackfillSteps.IdentityBackfillDeps
import com.gu.identityBackfill.IdentityBackfillSteps.IdentityBackfillDeps.StepsConfig
import com.gu.util.Config
import com.gu.util.apigateway.ApiGatewayHandler.LambdaIO
import com.gu.util.apigateway.{ ApiGatewayHandler, ApiGatewayRequest }
import com.gu.util.reader.Types.FailableOp

object Handler {

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    runWithEffects(RawEffects.createDefault, LambdaIO(inputStream, outputStream, context))

  def runWithEffects(rawEffects: RawEffects, lambdaIO: LambdaIO): Unit = {
    def operation(config: Config[StepsConfig]): ApiGatewayRequest => FailableOp[Unit] =
      IdentityBackfillSteps.apply(IdentityBackfillDeps.default(rawEffects.now(), rawEffects.response, config))
    ApiGatewayHandler.default[StepsConfig](implicitly)(operation, lambdaIO).run((rawEffects.stage, rawEffects.s3Load(rawEffects.stage)))
  }

}

package com.gu.sfContactMerge

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayResponse}
import com.gu.util.config.LoadConfigModule.StringFromS3
import com.gu.util.config.{LoadConfigModule, Stage, TrustedApiConfig}
import com.gu.util.reader.Types._

object Handler {

  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    runWithEffects(RawEffects.stage, GetFromS3.fetchString, LambdaIO(inputStream, outputStream, context))
  }

  def runWithEffects(stage: Stage, fetchString: StringFromS3, lambdaIO: LambdaIO) = {

    ApiGatewayHandler(lambdaIO) {
      for {
        trustedApiConfig <- LoadConfigModule(stage, fetchString)[TrustedApiConfig].toApiGatewayOp("load trusted Api config")
        configuredOp = Operation.noHealthcheck(req => ApiGatewayResponse.notFound("implementation Not Found (yet)"), false)
      } yield (trustedApiConfig, configuredOp)
    }

  }

}

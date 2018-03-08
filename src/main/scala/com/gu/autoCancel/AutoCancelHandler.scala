package com.gu.autoCancel

import java.io.{ InputStream, OutputStream }

import com.amazonaws.services.lambda.runtime.Context
import com.gu.autoCancel.AutoCancelSteps.AutoCancelStepsDeps
import com.gu.effects.RawEffects
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.zuora.ZuoraRestConfig
import com.gu.util.{ Config, Logging }

object AutoCancelHandler extends App with Logging {

  def default(rawEffects: RawEffects) =
    ApiGatewayHandler(rawEffects.stage, rawEffects.s3Load, { config: Config[ZuoraRestConfig] =>
      AutoCancelSteps(AutoCancelStepsDeps.default(rawEffects.now(), rawEffects.response, config))
    })

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    default(RawEffects.createDefault)(inputStream, outputStream, context)
  }

}

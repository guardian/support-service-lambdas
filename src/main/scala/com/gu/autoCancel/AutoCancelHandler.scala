package com.gu.autoCancel

import java.io.{ InputStream, OutputStream }

import com.amazonaws.services.lambda.runtime.Context
import com.gu.autoCancel.AutoCancelSteps.AutoCancelStepsDeps
import com.gu.effects.RawEffects
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.apigateway.ApiGatewayHandler.HandlerDeps
import com.gu.util.{ Config, Logging }

object AutoCancelHandler extends App with Logging {

  case class ACDeps(agh: (InputStream, OutputStream, Context) => Unit)

  def default(rawEffects: RawEffects) =
    ACDeps(
      ApiGatewayHandler(HandlerDeps.default(rawEffects.stage, rawEffects.s3Load, { config: Config =>
        AutoCancelSteps(AutoCancelStepsDeps.default(rawEffects.now(), rawEffects.response, config))
      }))
    )

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    val deps = default(RawEffects.createDefault)
    deps.agh(inputStream, outputStream, context)
  }

}

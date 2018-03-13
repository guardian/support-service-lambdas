package com.gu.paymentFailure

import java.io.{ InputStream, OutputStream }

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.paymentFailure.PaymentFailureSteps.PFDeps
import com.gu.util.Config
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.zuora.ZuoraRestConfig

object Lambda {

  def default(rawEffects: RawEffects) =
    ApiGatewayHandler(rawEffects.stage, rawEffects.s3Load, { config: Config[ZuoraRestConfig] =>
      PaymentFailureSteps(PFDeps.default(rawEffects.response, config))
    })

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  // it's the only part you can't test of the handler
  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    default(RawEffects.createDefault)(inputStream, outputStream, context)
  }

}

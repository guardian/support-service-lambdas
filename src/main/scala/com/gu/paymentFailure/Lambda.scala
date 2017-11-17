package com.gu.paymentFailure

import java.io.{ InputStream, OutputStream }

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.RawEffects
import com.gu.util.apigateway.ApiGatewayHandler

object Lambda {

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    ApiGatewayHandler(RawEffects.default, inputStream, outputStream, context) {
      PaymentFailureSteps()
    }

}

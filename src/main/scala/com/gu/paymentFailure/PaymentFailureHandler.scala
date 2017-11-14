package com.gu.paymentFailure

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.util.apigateway.ApiGatewayHandler

object Lambda {

  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {

    val stage = System.getenv("Stage")

    ApiGatewayHandler.handleRequest(inputStream, outputStream, context, stage) {
      PaymentFailureSteps.performZuoraAction()
    }
  }

}

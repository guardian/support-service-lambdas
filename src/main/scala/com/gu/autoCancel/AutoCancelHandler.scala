package com.gu.autoCancel

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.Logging
import com.gu.util.apigateway.ApiGatewayHandler

object AutoCancelHandler extends App with Logging {

  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {

    val stage = System.getenv("Stage")

    ApiGatewayHandler.handleRequest(inputStream, outputStream, context, stage) {
      AutoCancelSteps.performZuoraAction
    }
  }
}

package com.gu.autoCancel

import java.io.{ InputStream, OutputStream }

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{ Logging, StateHttp }
import com.gu.util._
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.apigateway.ApiGatewayHandler.LambdaConfig

object AutoCancelHandler extends App with Logging {

  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {

    val stage = System.getenv("Stage")
    val configAttempt = Config.load(stage)
    val getZuoraRestService = configAttempt.map {
      config => new StateHttp(config.zuoraRestConfig, config.etConfig)
    }

    val lambdaConfig = LambdaConfig(configAttempt, stage, getZuoraRestService, AutoCancelSteps.performZuoraAction)
    ApiGatewayHandler.handleRequest(inputStream, outputStream, context)(lambdaConfig)
  }
}

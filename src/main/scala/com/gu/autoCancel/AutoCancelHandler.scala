package com.gu.autoCancel

import com.gu.effects.Logging
import com.gu.util.apigateway.ApiGatewayHandler

object AutoCancelHandler extends App with Logging {

  def handleRequest = ApiGatewayHandler() {
    AutoCancelSteps.performZuoraAction
  }_

}

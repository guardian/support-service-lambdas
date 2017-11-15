package com.gu.paymentFailure

import com.gu.util.apigateway.ApiGatewayHandler

object Lambda {

  def handleRequest = ApiGatewayHandler() {
    PaymentFailureSteps.performZuoraAction()
  }_

}

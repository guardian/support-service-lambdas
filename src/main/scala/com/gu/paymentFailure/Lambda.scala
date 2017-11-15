package com.gu.paymentFailure

import com.gu.effects.RawEffects
import com.gu.util.apigateway.ApiGatewayHandler

object Lambda {

  // this is the entry point
  // it's referenced by the cloudformation so make sure you keep it in step
  def handleRequest = ApiGatewayHandler(RawEffects.default) {
    PaymentFailureSteps()
  }_

}

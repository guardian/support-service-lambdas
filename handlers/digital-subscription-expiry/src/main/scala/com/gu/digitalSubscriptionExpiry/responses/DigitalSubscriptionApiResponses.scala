package com.gu.digitalSubscriptionExpiry.responses

import com.gu.util.apigateway.ApiGatewayResponse

object DigitalSubscriptionApiResponses {
  val notFoundResponse = ApiGatewayResponse("404", ErrorResponse("Unknown subscriber", -90))
  val badRequest = ApiGatewayResponse("400", ErrorResponse("Mandatory data missing from request", -50))
}

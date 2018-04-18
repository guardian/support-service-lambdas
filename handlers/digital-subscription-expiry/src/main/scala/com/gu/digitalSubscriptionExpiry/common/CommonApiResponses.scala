package com.gu.digitalSubscriptionExpiry.common

import com.gu.digitalSubscriptionExpiry.{DigitalSubscriptionExpiryResponse, ErrorResponse}
import com.gu.util.apigateway.ResponseModels.{ApiResponse, Headers}
import play.api.libs.json.Json

object CommonApiResponses {
  def apiResponse(body: DigitalSubscriptionExpiryResponse, status: String) = {
    val bodyTxt = Json.prettyPrint(Json.toJson(body))
    ApiResponse(status, new Headers, bodyTxt)
  }

  val notFoundResponse = apiResponse(ErrorResponse("Unknown subscriber", -90), "404")
  val badRequest = apiResponse(ErrorResponse("Mandatory data missing from request", -50), "400")

}

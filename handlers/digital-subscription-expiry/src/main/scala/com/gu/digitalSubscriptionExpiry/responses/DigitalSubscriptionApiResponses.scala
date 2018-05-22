package com.gu.digitalSubscriptionExpiry.responses

import com.gu.util.apigateway.ResponseModels.ApiResponse
import play.api.libs.json.Json

object DigitalSubscriptionApiResponses {

  def apiResponse(body: DigitalSubscriptionExpiryResponse, status: String) = {
    val bodyTxt = Json.prettyPrint(Json.toJson(body))
    ApiResponse(status, bodyTxt)
  }

  val notFoundResponse = apiResponse(ErrorResponse("Unknown subscriber", -90), "404")
  val badRequest = apiResponse(ErrorResponse("Mandatory data missing from request", -50), "400")

}

package com.gu.batchemailsender.api.batchemail.model

import com.gu.util.apigateway.ApiGatewayResponse
import play.api.libs.json.Json

sealed trait EmailBatchSenderResponse

case class SuccessResponse(message: String) extends EmailBatchSenderResponse

object SuccessResponse {
  implicit val successResponseWrites = Json.writes[SuccessResponse]
}

case class FailureResponse(message: String, code: Int, failed_item_ids: Option[List[String]]) extends EmailBatchSenderResponse

object FailureResponse {
  implicit val failureResponseWrites = Json.writes[FailureResponse]
}

object EmailBatchSenderResponses {
  val badRequest = ApiGatewayResponse("400", FailureResponse("Mandatory data missing from request", 400, None))
  def someItemsFailed(failedIds: List[String]) = ApiGatewayResponse("502", FailureResponse("There were items that were not added to the queue.", 502, Some(failedIds)))
}


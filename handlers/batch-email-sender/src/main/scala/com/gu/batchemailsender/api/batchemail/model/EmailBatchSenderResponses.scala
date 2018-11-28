package com.gu.batchemailsender.api.batchemail.model

import com.gu.util.apigateway.ApiGatewayResponse
import play.api.libs.json.Json

sealed trait EmailBatchSenderResponse

case class FailureResponse(message: String, code: Int, failed_item_ids: Option[List[String]]) extends EmailBatchSenderResponse

object FailureResponse {
  implicit val failureResponseWrites = Json.writes[FailureResponse]
}

object EmailBatchSenderResponses {
  def someItemsFailed(failedIds: List[String]) =
    ApiGatewayResponse(
      statusCode = "502",
      body = FailureResponse("There were items that were not added to the queue.", 502, Some(failedIds))
    )
}


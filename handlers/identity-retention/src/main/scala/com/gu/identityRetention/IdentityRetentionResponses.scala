package com.gu.identityRetention

import java.time.LocalDate
import com.gu.util.apigateway.ResponseModels.ApiResponse
import play.api.libs.json.{Json, Writes}

object IdentityRetentionResponseModels {

  sealed trait IdentityRetentionResponse

  case class SuccessResponse(ongoingRelationship: Boolean, serviceEndDate: Option[LocalDate]) extends IdentityRetentionResponse

  object SuccessResponse {
    implicit val successResponseWrites = Json.writes[SuccessResponse]
  }

  case class NotFoundResponse(previousRelationship: Boolean) extends IdentityRetentionResponse

  object NotFoundResponse {
    implicit val notFoundResponseWrites = Json.writes[NotFoundResponse]
  }

  object IdentityRetentionResponse {
    implicit val identityRetentionResponseWrites = new Writes[IdentityRetentionResponse] {
      override def writes(response: IdentityRetentionResponse) = response match {
        case success: SuccessResponse => Json.toJson(success)
        case error: NotFoundResponse => Json.toJson(error)
      }
    }
  }

}

object IdentityRetentionApiResponses {

  import com.gu.identityRetention.IdentityRetentionResponseModels.{IdentityRetentionResponse, NotFoundResponse, SuccessResponse}

  def apiResponse(body: IdentityRetentionResponse, status: String) = {
    val bodyTxt = Json.prettyPrint(Json.toJson(body))
    ApiResponse(status, bodyTxt)
  }

  val ongoingRelationship = apiResponse(SuccessResponse(true, None), "200")
  def cancelledRelationship(latestCancellationDate: LocalDate) = apiResponse(SuccessResponse(false, Some(latestCancellationDate)), "200")

  val notFoundInZuora = apiResponse(NotFoundResponse(false), "404")
  val outsideOfRetentionPeriod = apiResponse(NotFoundResponse(true), "404")

}


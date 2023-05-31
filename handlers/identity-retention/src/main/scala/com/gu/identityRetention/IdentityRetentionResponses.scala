package com.gu.identityRetention

import java.time.LocalDate
import com.gu.util.apigateway.ResponseModels.ApiResponse
import play.api.libs.json.{Json, Writes}

object IdentityRetentionResponseModels {

  sealed trait IdentityRetentionResponse

  case class SuccessResponse(
      ongoingRelationship: Boolean,
      relationshipEndDate: LocalDate,
      effectiveDeletionDate: LocalDate,
      responseValidUntil: LocalDate,
  ) extends IdentityRetentionResponse

  object SuccessResponse {
    implicit val successResponseWrites = Json.writes[SuccessResponse]

    /** effectiveDeletionDate is 7 years after relationshipEndDate the response is valid until the effectiveDeletionDate
      * or in three months time, whichever is sooner.
      * @param ongoingRelationship
      * @param relationshipEndDate
      * @return
      */
    def apply(ongoingRelationship: Boolean, relationshipEndDate: LocalDate): SuccessResponse = {
      val effectiveDeletionDate = relationshipEndDate.plusYears(7)
      val responseValidUntil = List(effectiveDeletionDate, LocalDate.now().plusMonths(3)).min
      SuccessResponse(ongoingRelationship, relationshipEndDate, effectiveDeletionDate, responseValidUntil)
    }
  }

  case class NotFoundResponse(message: String = "User has no active relationships") extends IdentityRetentionResponse

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

  import com.gu.identityRetention.IdentityRetentionResponseModels.{
    IdentityRetentionResponse,
    NotFoundResponse,
    SuccessResponse,
  }

  def apiResponse(body: IdentityRetentionResponse, status: String) = {
    val bodyTxt = Json.prettyPrint(Json.toJson(body))
    ApiResponse(status, bodyTxt)
  }

  def ongoingRelationship(
      effectiveLapsedDate: LocalDate,
  ) = apiResponse(SuccessResponse(true, effectiveLapsedDate), "200")

  def cancelledRelationship(
      latestCancellationDate: LocalDate,
  ) =
    apiResponse(SuccessResponse(false, latestCancellationDate), "200")

  val canBeDeleted = apiResponse(NotFoundResponse(), "404")

}

package com.gu.identityRetention

import java.time.LocalDate
import java.time.temporal.ChronoUnit
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
      * or in about 3 months time, whichever is sooner.
      * @param ongoingRelationship
      * @param relationshipEndDate
      * @return
      */
    def apply(
        ongoingRelationship: Boolean,
        relationshipEndDate: LocalDate,
        today: LocalDate = LocalDate.now(),
    ): SuccessResponse = {
      val effectiveDeletionDate = relationshipEndDate.plusYears(7)
      val responseValidUntil =
        if (effectiveDeletionDate isBefore today)
          today.plusMonths(3)
        else
          val proportionOfMaxLifetimes = today.until(effectiveDeletionDate, ChronoUnit.DAYS) / (365 * 7)
          List(
            effectiveDeletionDate, 
            today.plusDays(60 + (proportionOfMaxLifetimes * 60)) //adds some variation so that the validUntil date is between 60 and 120 days (or longer, if the deletion date is over 7 years in the future)
          ).min
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
      latestLapsedDate: LocalDate,
      today: LocalDate = LocalDate.now(),
  ) = apiResponse(SuccessResponse(true, latestLapsedDate, today), "200")

  def lapsedRelationship(
      latestLapsedDate: LocalDate,
      today: LocalDate = LocalDate.now(),
  ) =
    apiResponse(SuccessResponse(false, latestLapsedDate, today), "200")

  val canBeDeleted = apiResponse(NotFoundResponse(), "404")

}

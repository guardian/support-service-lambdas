package com.gu.newproduct.api.addsubscription

import java.time.LocalDate

import play.api.libs.json.{JsError, JsSuccess, Json, Reads}

import scala.util.{Failure, Success, Try}

case class AddSubscriptionRequest(
  zuoraAccountId: String,
  contractEffectiveDate: LocalDate,
  acquisitionSource: String,
  createdByCSR: String,
  amountMinorUnits: Int,
)

object AddSubscriptionRequest {

  case class AddSubscriptionRequestWire(
    zuoraAccountId: String,
    contractEffectiveDate: String,
    acquisitionSource: String,
    createdByCSR: String,
    amountMinorUnits: Int,
  ) {
    def toAddSubscriptionRequest = {
      val maybeParsedRequest = Try(LocalDate.parse(contractEffectiveDate)).map { parsedEffectiveDate =>
        AddSubscriptionRequest(
          zuoraAccountId = this.zuoraAccountId,
          contractEffectiveDate = parsedEffectiveDate,
          acquisitionSource = this.acquisitionSource,
          createdByCSR = this.createdByCSR,
          amountMinorUnits = this.amountMinorUnits
        )
      }

      maybeParsedRequest match {
        case Success(req) => JsSuccess(req)
        case Failure(req) => JsError("invalid date format")
      }
    }
  }

  val wireReads = Json.reads[AddSubscriptionRequestWire]
  implicit val reads: Reads[AddSubscriptionRequest] = json => wireReads.reads(json).flatMap(_.toAddSubscriptionRequest)
}
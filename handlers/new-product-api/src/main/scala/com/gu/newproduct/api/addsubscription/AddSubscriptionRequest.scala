package com.gu.newproduct.api.addsubscription

import java.time.LocalDate

import play.api.libs.json.{JsError, JsSuccess, Json, Reads}

import scala.util.{Failure, Success, Try}

case class ZuoraAccountId(value: String) extends AnyVal

case class AddSubscriptionRequest(
  zuoraAccountId: ZuoraAccountId,
  startDate: LocalDate,
  acquisitionSource: String,
  createdByCSR: String,
  amountMinorUnits: Int,
  cancellationCase: CaseId
)

case class CaseId(value: String) extends AnyVal

object AddSubscriptionRequest {

  case class AddSubscriptionRequestWire(
    zuoraAccountId: String,
    startDate: String,
    acquisitionSource: String,
    createdByCSR: String,
    amountMinorUnits: Int,
    cancellationCase: String
  ) {
    def toAddSubscriptionRequest = {
      val maybeParsedRequest = Try(LocalDate.parse(startDate)).map { parsedStartDate =>
        AddSubscriptionRequest(
          zuoraAccountId = ZuoraAccountId(zuoraAccountId),
          startDate = parsedStartDate,
          acquisitionSource = this.acquisitionSource,
          createdByCSR = this.createdByCSR,
          amountMinorUnits = this.amountMinorUnits,
          CaseId(cancellationCase)
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

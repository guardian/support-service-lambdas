package com.gu.newproduct.api.addsubscription

import java.time.LocalDate

import play.api.libs.json.{JsError, JsSuccess, Json, Reads}

import scala.util.{Failure, Success, Try}

case class ZuoraAccountId(value: String) extends AnyVal

case class AddSubscriptionRequest(
  zuoraAccountId: ZuoraAccountId,
  startDate: LocalDate,
  acquisitionSource: AcquisitionSource,
  createdByCSR: CreatedByCSR,
  amountMinorUnits: Int,
  acquisitionCase: CaseId
)

case class CaseId(value: String) extends AnyVal
case class AcquisitionSource(value: String) extends AnyVal
case class CreatedByCSR(value: String) extends AnyVal

object AddSubscriptionRequest {

  case class AddSubscriptionRequestWire(
    zuoraAccountId: String,
    startDate: String,
    acquisitionSource: String,
    createdByCSR: String,
    amountMinorUnits: Int,
    acquisitionCase: String
  ) {
    def toAddSubscriptionRequest = {
      val maybeParsedRequest = Try(LocalDate.parse(startDate)).map { parsedStartDate =>
        AddSubscriptionRequest(
          zuoraAccountId = ZuoraAccountId(zuoraAccountId),
          startDate = parsedStartDate,
          acquisitionSource = AcquisitionSource(this.acquisitionSource),
          createdByCSR = CreatedByCSR(this.createdByCSR),
          amountMinorUnits = this.amountMinorUnits,
          CaseId(acquisitionCase)
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

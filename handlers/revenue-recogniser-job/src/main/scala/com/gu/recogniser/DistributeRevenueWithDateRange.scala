package com.gu.recogniser

import com.gu.util.resthttp.RestRequestMaker
import play.api.libs.json.{JsSuccess, Json, Reads}

import java.time.LocalDate

object DistributeRevenueWithDateRange {

  case class DistributeRevenueWithDateRangeRequest(
      recognitionStart: LocalDate,
      recognitionEnd: LocalDate,
      distributionType: String = "Daily distribution",
      eventTypeSystemId: String = "DigitalSubscriptionGiftRedeemed",
  )

  implicit val writes = Json.writes[DistributeRevenueWithDateRangeRequest]

  implicit val unitReads: Reads[Unit] =
    Reads(_ => JsSuccess(()))

}

case class DistributeRevenueWithDateRange(restRequestMaker: RestRequestMaker.Requests) {

  import DistributeRevenueWithDateRange._

  // https://www.zuora.com/developer/api-reference/#operation/PUT_RevenueByRecognitionStartandEndDates
  def distribute(
      revenueScheduleNumber: String,
      startDate: LocalDate,
      endDate: LocalDate,
  ) = {
    restRequestMaker.put[DistributeRevenueWithDateRangeRequest, Unit](
      DistributeRevenueWithDateRangeRequest(startDate, endDate),
      s"revenue-schedules/${revenueScheduleNumber}/distribute-revenue-with-date-range",
    )
  }
}

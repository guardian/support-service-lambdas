package com.gu.recogniser

import com.gu.util.resthttp.RestRequestMaker
import play.api.libs.json.{JsSuccess, Json, Reads}

import java.time.LocalDate

object DistributeRevenueOnSpecificDate {

  case class DistributeRevenueOnSpecificDateRequest(
      distributeOn: LocalDate,
      percentage: Int = 100,
      distributionType: String = "specific date (delta percent undistributed)",
      eventTypeSystemId: String = "DigitalSubscriptionGiftRedeemed",
  )

  implicit val writes = Json.writes[DistributeRevenueOnSpecificDateRequest]

  implicit val unitReads: Reads[Unit] =
    Reads(_ => JsSuccess(()))

}

case class DistributeRevenueOnSpecificDate(restRequestMaker: RestRequestMaker.Requests) {

  import DistributeRevenueOnSpecificDate._

  // https://www.zuora.com/developer/api-reference/#operation/PUT_RevenueSpecificDate
  def distribute(
      revenueScheduleNumber: String,
      dateToDistribute: LocalDate,
  ) = {
    restRequestMaker.put[DistributeRevenueOnSpecificDateRequest, Unit](
      DistributeRevenueOnSpecificDateRequest(dateToDistribute),
      s"revenue-schedules/${revenueScheduleNumber}/distribute-revenue-on-specific-date",
    )
  }
}

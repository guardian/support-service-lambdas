package com.gu.recogniser

import com.gu.util.resthttp.RestRequestMaker
import play.api.libs.functional.syntax._
import play.api.libs.json.{JsPath, JsSuccess, Json, Reads}

object DistributeRevenueAcrossAccountingPeriods {

  case class RevenueDistribution(
    accountingPeriodName: String,
    newAmountInPence: Int
  )

  implicit val revenueDistributionWrites = (
    (JsPath \ "number").write[String] and
    (JsPath \ "undistributedUnrecognizedRevenue").write[Double].contramap((i: Int) => i.toDouble / 100)
  )(unlift(RevenueDistribution.unapply _))

  case class DistributeRevenueAcrossAccountingPeriodsRequest(
    revenueDistributions: List[RevenueDistribution],
    eventTypeSystemId: String = "DigitalSubscriptionGiftRedeemed"
  )

  implicit val writes = Json.writes[DistributeRevenueAcrossAccountingPeriodsRequest]

  implicit val unitReads: Reads[Unit] =
    Reads(_ => JsSuccess(()))

}

case class DistributeRevenueAcrossAccountingPeriods(restRequestMaker: RestRequestMaker.Requests) {

  import DistributeRevenueAcrossAccountingPeriods._

  // https://www.zuora.com/developer/api-reference/#operation/PUT_RevenueAcrossAP
  def distribute(
    revenueScheduleNumber: String,
    revenueDistributions: List[RevenueDistribution]
  ) = restRequestMaker.put[DistributeRevenueAcrossAccountingPeriodsRequest, Unit](
    DistributeRevenueAcrossAccountingPeriodsRequest(revenueDistributions),
    s"revenue-schedules/${revenueScheduleNumber}/distribute-revenue-with-date-range"
  )
}

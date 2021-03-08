package com.gu.recogniser

import com.gu.util.resthttp.RestRequestMaker
import play.api.libs.functional.syntax.toFunctionalBuilderOps
import play.api.libs.json.{JsPath, Json}

object GetRevenueSchedules {

  case class RevenueItem(
    accountingPeriodName: String,
    isAccountingPeriodClosed: Boolean,
    amountInPence: Int
  )

  implicit val revenueItemReads = (
    (JsPath \ "accountingPeriodName").read[String] and
    (JsPath \ "isAccountingPeriodClosed").read[Boolean] and
    (JsPath \ "amount").read[Double].map(d => (d * 100).toInt)
  )(RevenueItem.apply _)

  case class RevenueScheduleResponse(
    number: String,
    amount: Int,
    undistributedAmountInPence: Int,
    revenueItems: List[RevenueItem]
  )

  implicit val revenueScheduleResponseReads = (
    (JsPath \ "number").read[String] and
    (JsPath \ "amount").read[Double].map(d => (d * 100).toInt) and
    (JsPath \ "undistributedUnrecognizedRevenue").read[Double].map(d => (d * 100).toInt) and
    (JsPath \ "revenueItems").read[List[RevenueItem]]
  )(RevenueScheduleResponse.apply _)

  case class GetRevenueSchedulesResponse(revenueSchedules: List[RevenueScheduleResponse])

  implicit val reads = Json.reads[GetRevenueSchedulesResponse]

}

case class GetRevenueSchedules(restRequestMaker: RestRequestMaker.Requests) {

  import GetRevenueSchedules._

  def execute(chargeId: String) =
    restRequestMaker.get[GetRevenueSchedulesResponse](s"revenue-schedules/subscription-charges/${chargeId}")

}

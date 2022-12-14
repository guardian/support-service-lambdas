package com.gu.recogniser

import com.gu.util.resthttp.RestRequestMaker
import play.api.libs.functional.syntax.toFunctionalBuilderOps
import play.api.libs.json.{JsPath, Json, Reads}

import java.time.LocalDate

object GetSubscription {

  case class GetSubscriptionResponse(
      redemptionDate: Option[LocalDate],
      isRedeemed: Boolean,
      termStartDate: LocalDate,
      initialTerm: Int,
      initialTermPeriodType: String,
  )

  implicit val revenueScheduleResponseReads: Reads[GetSubscriptionResponse] = (
    (JsPath \ "GiftRedemptionDate__c")
      .readNullable[String]
      .map(_.flatMap(date => if (date.isEmpty) None else Some(LocalDate.parse(date)))) and
      (JsPath \ "GifteeIdentityId__c").readNullable[String].map(_.nonEmpty) and
      (JsPath \ "termStartDate").read[LocalDate] and
      (JsPath \ "initialTerm").read[Int] and
      (JsPath \ "initialTermPeriodType").read[String]
  )(GetSubscriptionResponse.apply _)

}

case class GetSubscription(restRequestMaker: RestRequestMaker.Requests) {

  import GetSubscription._

  def execute(subscriptionNumber: String) =
    restRequestMaker.get[GetSubscriptionResponse](s"subscriptions/${subscriptionNumber}")

}

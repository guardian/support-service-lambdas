package com.gu.identityBackfill.zuora

import com.gu.identityBackfill.Types.AccountId
import com.gu.identityBackfill.supporterProductData.{ZuoraRatePlan, ZuoraSubscription}
import com.gu.util.resthttp.Types.{ClientFailableOp, GenericError, traverse}
import com.gu.util.zuora.SafeQueryBuilder.Implicits._
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import play.api.libs.json.{Json, Reads}

import java.time.LocalDate
import scala.util.Try

object GetSubscriptionsForAccount {

  case class WireSubscription(
      Id: String,
      Name: String,
      TermEndDate: String,
      ContractEffectiveDate: String,
  )
  implicit val wireSubReads: Reads[WireSubscription] = Json.reads[WireSubscription]

  case class WireRatePlan(
      ProductRatePlanId: String,
      Name: String,
  )
  implicit val wireRatePlanReads: Reads[WireRatePlan] = Json.reads[WireRatePlan]

  def apply(zuoraQuerier: ZuoraQuerier)(accountId: AccountId): ClientFailableOp[List[ZuoraSubscription]] =
    for {
      subQuery <-
        zoql"SELECT Id, Name, TermEndDate, ContractEffectiveDate FROM Subscription where AccountId=${accountId.value} and Status='Active'"
      subResults <- zuoraQuerier[WireSubscription](subQuery)
      withRatePlans <- traverse(subResults.records.toList)(fetchRatePlansForSubscription(zuoraQuerier))
    } yield withRatePlans

  private def fetchRatePlansForSubscription(
      zuoraQuerier: ZuoraQuerier,
  )(sub: WireSubscription): ClientFailableOp[ZuoraSubscription] =
    for {
      rpQuery <- zoql"SELECT ProductRatePlanId, Name FROM RatePlan where SubscriptionId=${sub.Id}"
      rpResults <- zuoraQuerier[WireRatePlan](rpQuery)
      ratePlans = rpResults.records.toList.map(rp => ZuoraRatePlan(rp.ProductRatePlanId, rp.Name))
      termEndDate <- parseDate(sub.TermEndDate, "TermEndDate", sub.Name)
      contractEffectiveDate <- parseDate(sub.ContractEffectiveDate, "ContractEffectiveDate", sub.Name)
    } yield ZuoraSubscription(sub.Name, termEndDate, contractEffectiveDate, ratePlans)

  private def parseDate(value: String, field: String, sub: String): ClientFailableOp[LocalDate] =
    Try(LocalDate.parse(value)).toEither.left
      .map(err => GenericError(s"could not parse $field for $sub: ${err.getMessage}"))
      .toClientFailableOp
}

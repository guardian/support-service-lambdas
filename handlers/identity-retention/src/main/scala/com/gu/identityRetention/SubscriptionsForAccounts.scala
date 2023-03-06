package com.gu.identityRetention

import java.time.LocalDate

import com.gu.identityRetention.Types.AccountId
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.SafeQueryBuilder.{OrTraverse, SafeQuery}
import com.gu.util.zuora.SafeQueryBuilder.Implicits._
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import play.api.libs.json.Json
import cats.data.NonEmptyList
import TypeConvert._

object SubscriptionsForAccounts {

  case class SubscriptionsQueryResponse(
      Id: String,
      Status: String,
      TermEndDate: LocalDate,
  )

  implicit val reads = Json.reads[SubscriptionsQueryResponse]

  def buildQuery(activeAccounts: NonEmptyList[AccountId]): ClientFailableOp[SafeQuery] =
    for {
      or <- OrTraverse(activeAccounts) { acc =>
        zoql"""
                status != 'Expired' and accountId = ${acc.value}
            """
      }
      subscriptionsQuery <- zoql"""
          select
            id,
            name,
            status,
            termEndDate
          from subscription
          where $or
        """
    } yield subscriptionsQuery

  def apply(
      zuoraQuerier: ZuoraQuerier,
  )(activeAccounts: NonEmptyList[AccountId]): ApiGatewayOp[List[SubscriptionsQueryResponse]] = {

    def searchForSubscriptions =
      for {
        subscriptionsQuery <- buildQuery(activeAccounts)
        queryResults <- zuoraQuerier[SubscriptionsQueryResponse](subscriptionsQuery)
      } yield queryResults

    searchForSubscriptions.map(_.records).toApiGatewayOp("Failed whilst querying Zuora for subscriptions")

  }

}

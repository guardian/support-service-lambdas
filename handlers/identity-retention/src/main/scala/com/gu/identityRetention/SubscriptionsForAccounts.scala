package com.gu.identityRetention

import java.time.LocalDate

import com.gu.identityRetention.Types.AccountId
import com.gu.util.reader.Types._
import com.gu.util.zuora.ZuoraQuery.{Or, Query, SanitisedQuery, ZuoraQuerier}
import play.api.libs.json.Json

object SubscriptionsForAccounts {

  case class SubscriptionsQueryResponse(
    Id: String,
    Status: String,
    TermEndDate: LocalDate
  )

  implicit val reads = Json.reads[SubscriptionsQueryResponse]

  def buildQuery(accountsToQuery: List[AccountId]): SanitisedQuery = {
    zoql"""select
       | id,
       | name,
       | status,
       | termEndDate
       | from subscription
       | where ${Or(accountsToQuery.map(acc => zoql"status != 'Expired' and accountId = ${acc.value}"))}
       |"""
      .stripMarginAndNewline
  }

  def apply(zuoraQuerier: ZuoraQuerier)(activeAccounts: List[AccountId]): ApiGatewayOp[List[SubscriptionsQueryResponse]] = {

    def searchForSubscriptions = {
      val subscriptionsQuery = buildQuery(activeAccounts)
      zuoraQuerier[SubscriptionsQueryResponse](subscriptionsQuery)
    }

    searchForSubscriptions.map(_.records).toApiGatewayOp("Failed whilst querying Zuora for subscriptions")

  }

}

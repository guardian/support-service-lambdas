package com.gu.identityRetention

import java.time.LocalDate

import com.gu.identityRetention.Types.AccountId
import com.gu.util.reader.Types._
import com.gu.util.zuora.RestRequestMaker.ClientFailableOp
import com.gu.util.zuora.SafeQueryBuilder.{OrTraverse, SanitisedQuery}
import com.gu.util.zuora.SafeQueryBuilder.Implicits._
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import play.api.libs.json.Json

object SubscriptionsForAccounts {

  case class SubscriptionsQueryResponse(
    Id: String,
    Status: String,
    TermEndDate: LocalDate
  )

  implicit val reads = Json.reads[SubscriptionsQueryResponse]

  def buildQuery(accountsToQuery: List[AccountId]): ClientFailableOp[SanitisedQuery] = {
    zoql"""select
        id,
        name,
        status,
        termEndDate
        from subscription
        where ${OrTraverse(accountsToQuery)(acc => zoql"status != 'Expired' and accountId = ${acc.value}")}
       """
  }

  def apply(zuoraQuerier: ZuoraQuerier)(activeAccounts: List[AccountId]): ApiGatewayOp[List[SubscriptionsQueryResponse]] = {

    def searchForSubscriptions =
      for {
        subscriptionsQuery <- buildQuery(activeAccounts)
        queryResults <- zuoraQuerier[SubscriptionsQueryResponse](subscriptionsQuery)
      } yield queryResults

    searchForSubscriptions.map(_.records).toApiGatewayOp("Failed whilst querying Zuora for subscriptions")

  }

}

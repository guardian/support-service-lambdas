package com.gu.identityRetention

import java.time.LocalDate
import com.gu.identityRetention.Types.AccountId
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.FailableOp
import com.gu.util.zuora.ZuoraQuery
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import play.api.libs.json.Json
import scalaz.{-\/, \/-}

object QueryZuoraSubscriptions {

  case class SubscriptionsQueryResponse(Id: String, Status: String, Name: String, TermEndDate: LocalDate)
  implicit val reads = Json.reads[SubscriptionsQueryResponse]

  def buildQuery(accountsToQuery: List[AccountId]): String = {
    val accountIdClause = "accountId = '" + accountsToQuery.map(_.value).mkString("' or accountId = '") + "'"
    s"select id, name, status, termEndDate from subscription where status != 'Expired' and $accountIdClause"
  }

  def apply(activeAccounts: List[AccountId], zuoraQuerier: ZuoraQuerier): FailableOp[List[SubscriptionsQueryResponse]] = {

    def searchForSubscriptions = {
      val subscriptionsQuery = ZuoraQuery.Query(buildQuery(activeAccounts))
      zuoraQuerier[SubscriptionsQueryResponse](subscriptionsQuery)
    }

    searchForSubscriptions match {
      case \/-(subscriptions) =>
        \/-(subscriptions.records)
      case -\/(_) =>
        -\/(ApiGatewayResponse.internalServerError("Fail"))
    }

  }

}

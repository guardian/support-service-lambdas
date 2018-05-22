package com.gu.identityRetention

import com.gu.identityRetention.Types.{AccountId, IdentityId}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.FailableOp
import com.gu.util.zuora.RestRequestMaker.ClientFailableOp
import com.gu.util.zuora.ZuoraQuery
import com.gu.util.zuora.ZuoraQuery.{QueryResult, ZuoraQuerier}
import play.api.libs.json.Json
import scalaz.{-\/, \/-}

object HasActiveZuoraAccounts {

  case class IdentityQueryResponse(Id: String, Status: String)
  implicit val reads = Json.reads[IdentityQueryResponse]

  def apply(identityId: IdentityId, zuoraQuerier: ZuoraQuerier): FailableOp[List[AccountId]] = {

    def searchForAccounts = {
      val identityQuery = ZuoraQuery.Query(s"select id, status from account where IdentityId__c = '${identityId.value}'")
      zuoraQuerier[IdentityQueryResponse](identityQuery)
    }

    processQueryResult(searchForAccounts)

  }

  def processQueryResult(queryAttempt: ClientFailableOp[QueryResult[IdentityQueryResponse]]): FailableOp[List[AccountId]] = queryAttempt match {
    case \/-(result) if result.size > 0 =>
      \/-(result.records.map(account => AccountId(account.Id)))
    case \/-(result) if result.size == 0 =>
      -\/(IdentityRetentionApiResponses.notFoundInZuora)
    case -\/(error) =>
      -\/(ApiGatewayResponse.internalServerError("Failed to retrieve the identity user's details from Zuora"))
  }

}

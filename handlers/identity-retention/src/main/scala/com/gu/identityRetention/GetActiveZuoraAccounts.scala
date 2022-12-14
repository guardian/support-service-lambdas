package com.gu.identityRetention

import com.gu.identityRetention.Types.{AccountId, IdentityId}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.{ClientFailure, ClientFailableOp, ClientSuccess}
import com.gu.util.zuora.SafeQueryBuilder.Implicits._
import com.gu.util.zuora.ZuoraQuery.{QueryResult, ZuoraQuerier}
import play.api.libs.json.Json

object GetActiveZuoraAccounts {

  case class IdentityQueryResponse(Id: String)
  implicit val reads = Json.reads[IdentityQueryResponse]

  def apply(zuoraQuerier: ZuoraQuerier)(identityId: IdentityId): ApiGatewayOp[List[AccountId]] = {

    def searchForAccounts = {

      /*
      Todo simplify this once we can rely on Account.Status
      Unfortunately Zuora do not support parentheses, and != doesn't pick up nulls
      https://knowledgecenter.zuora.com/DC_Developers/K_Zuora_Object_Query_Language#Syntax
       */
      for {
        commonConditions <- zoql"IdentityId__c = ${identityId.value} and status != 'Canceled'"
        identityQuery <- zoql"""select id
            from account
            where $commonConditions and ProcessingAdvice__c != 'DoNotProcess'
               or $commonConditions and ProcessingAdvice__c = null
           """
        queryResult <- zuoraQuerier[IdentityQueryResponse](identityQuery)
      } yield queryResult
    }

    processQueryResult(searchForAccounts)

  }

  def processQueryResult(
      queryAttempt: ClientFailableOp[QueryResult[IdentityQueryResponse]],
  ): ApiGatewayOp[List[AccountId]] =
    (queryAttempt match {
      case ClientSuccess(result) if result.size > 0 =>
        Right(result.records.map(account => AccountId(account.Id)))
      case ClientSuccess(result) if result.size == 0 =>
        Left(IdentityRetentionApiResponses.canBeDeleted)
      case error: ClientFailure =>
        Left(
          ApiGatewayResponse.internalServerError(s"Failed to retrieve the identity user's details from Zuora: $error"),
        )
    }).toApiGatewayOp

}

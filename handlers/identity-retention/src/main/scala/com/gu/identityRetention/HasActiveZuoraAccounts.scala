package com.gu.identityRetention

import com.gu.identityRetention.Types.IdentityId
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.FailableOp
import com.gu.util.zuora.ZuoraQuery
import com.gu.util.zuora.ZuoraQuery.ZuoraQuerier
import play.api.libs.json.Json
import scalaz.{-\/, \/-}

object HasActiveZuoraAccounts {

  case class IdentityQueryResponse(Id: String, Status: String)
  implicit val reads = Json.reads[IdentityQueryResponse]

  def apply(identityId: IdentityId, zuoraQuerier: ZuoraQuerier): FailableOp[Unit] = {

    def searchForAccounts = {
      val identityQuery = ZuoraQuery.Query(s"select id, status from account where IdentityId__c = '${identityId.value}'")
      zuoraQuerier[IdentityQueryResponse](identityQuery)
    }

    searchForAccounts match {
      case \/-(result) if result.size > 0 =>
        \/-(())
      case \/-(result) if result.size == 0 =>
        -\/(ApiGatewayResponse.notFound("Identity user has no linked Zuora accounts"))
      case -\/(error) =>
        -\/(ApiGatewayResponse.internalServerError("Failed to retrieve the identity user's details from Zuora"))
    }

  }

}

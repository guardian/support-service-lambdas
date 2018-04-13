package com.gu.identityBackfill.zuora

import com.gu.identityBackfill.Types.{AccountId, IdentityId}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.FailableOp
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, Requests}
import com.gu.util.zuora.ZuoraQuery
import play.api.libs.json.Json
import scalaz.ListT

object CountZuoraAccountsForIdentityId {

  case class WireResponse(Id: String)
  implicit val reads = Json.reads[WireResponse]

  def apply(requests: Requests)(identityId: IdentityId): FailableOp[Int] = {
    val accounts = for {
      accountsWithEmail <- ListT[ClientFailableOp, WireResponse](ZuoraQuery.getResults[WireResponse](requests)(ZuoraQuery.Query(s"SELECT Id FROM Account where IdentityId__c='${identityId.value}'")).map(_.records))
    } yield AccountId(accountsWithEmail.Id)

    accounts.run.bimap(e => ApiGatewayResponse.internalServerError(e.message), l => l.size)
  }

}

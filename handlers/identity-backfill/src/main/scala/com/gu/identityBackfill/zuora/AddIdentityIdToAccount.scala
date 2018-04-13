package com.gu.identityBackfill.zuora

import com.gu.identityBackfill.Types
import com.gu.identityBackfill.Types.{AccountId, IdentityId}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.FailableOp
import com.gu.util.zuora.RestRequestMaker.Requests
import com.gu.util.zuora.ZuoraReaders.unitReads
import play.api.libs.json.Json

object AddIdentityIdToAccount {

  case class WireRequest(IdentityId__c: String)
  implicit val writes = Json.writes[WireRequest]

  def reqFromIdentityId(id: Types.IdentityId): WireRequest = {
    WireRequest(id.value)
  }

  def apply(requests: Requests)(accountId: AccountId, identityId: IdentityId): FailableOp[Unit] = {
    val accounts = requests.put[WireRequest, Unit](reqFromIdentityId(identityId), s"accounts/${accountId.value}")

    accounts.leftMap(e => ApiGatewayResponse.internalServerError(e.message))
  }

}

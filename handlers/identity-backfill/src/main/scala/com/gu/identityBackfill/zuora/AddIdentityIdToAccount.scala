package com.gu.identityBackfill.zuora

import com.gu.identityBackfill.Types.AccountId
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.{JsSuccess, Json, Reads}

object AddIdentityIdToAccount {

  case class WireRequest(IdentityId__c: String)
  implicit val writes = Json.writes[WireRequest]

  def reqFromIdentityId(id: IdentityId): WireRequest = {
    WireRequest(id.value)
  }

  implicit val unitReads: Reads[Unit] =
    Reads(_ => JsSuccess(()))

  def apply(requests: Requests)(accountId: AccountId, identityId: IdentityId): ClientFailableOp[Unit] =
    requests.put[WireRequest, Unit](reqFromIdentityId(identityId), s"accounts/${accountId.value}")

}

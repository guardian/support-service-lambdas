package com.gu.identityBackfill.salesforce

import com.gu.identityBackfill.Types.{IdentityId, SFContactId}
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, Requests}
import play.api.libs.json.Json

object UpdateSalesforceIdentityId {

  case class WireRequest(IdentityID__c: String)
  implicit val writes = Json.writes[WireRequest]

  def apply(sfRequests: Requests)(sFContactId: SFContactId, identityId: IdentityId): ClientFailableOp[Unit] =
    sfRequests.patch(WireRequest(identityId.value), s"/services/data/v20.0/sobjects/Contact/${sFContactId.value}")

}

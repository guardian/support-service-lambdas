package com.gu.identityBackfill.salesforce

import com.gu.salesforce.SalesforceConstants.salesforceApiVersion
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.util.resthttp.HttpOp
import com.gu.util.resthttp.RestRequestMaker.{PatchRequest, RelativePath}
import play.api.libs.json.Json

object UpdateSalesforceIdentityId {

  case class WireRequest(IdentityID__c: String)
  implicit val writes = Json.writes[WireRequest]

  case class IdentityId(value: String)

  def apply(patchOp: HttpOp[PatchRequest, Unit]): HttpOp[(SFContactId, IdentityId), Unit] =
    patchOp.setupRequestMultiArg(toRequest)

  def toRequest(sFContactId: SFContactId, identityId: IdentityId): PatchRequest = {
    val wireRequest = WireRequest(identityId.value)
    val relativePath = RelativePath(s"/services/data/v$salesforceApiVersion/sobjects/Contact/${sFContactId.value}")
    PatchRequest(wireRequest, relativePath)
  }

}

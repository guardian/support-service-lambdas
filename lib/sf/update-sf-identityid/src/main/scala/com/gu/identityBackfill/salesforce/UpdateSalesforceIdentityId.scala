package com.gu.identityBackfill.salesforce

import com.gu.salesforce.AnyVals.SFContactId
import com.gu.util.resthttp.HttpOp
import com.gu.util.resthttp.RestRequestMaker.{PatchRequest, RelativePath}
import play.api.libs.json.Json

object UpdateSalesforceIdentityId {

  case class WireRequest(IdentityID__c: String)
  implicit val writes = Json.writes[WireRequest]

  case class IdentityId(value: String)

  // handy extra function to do it without the option
  def set(patchOp: HttpOp[PatchRequest]): HttpOp[(SFContactId, IdentityId)] =
    patchOp.prepend2 { (contact, identity) => toRequest(contact, Some(identity)) }

  def apply(patchOp: HttpOp[PatchRequest]): HttpOp[(SFContactId, Option[IdentityId])] =
    patchOp.prepend2(toRequest)

  def toRequest(sFContactId: SFContactId, identityId: Option[IdentityId]): PatchRequest = {
    val wireRequest = WireRequest(identityId.map(_.value).getOrElse(""))
    val relativePath = RelativePath(s"/services/data/v20.0/sobjects/Contact/${sFContactId.value}")
    PatchRequest(wireRequest, relativePath)
  }

}

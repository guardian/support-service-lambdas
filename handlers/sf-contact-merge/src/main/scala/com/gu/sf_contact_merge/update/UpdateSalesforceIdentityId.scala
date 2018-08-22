package com.gu.sf_contact_merge.update

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getaccounts.GetEmails.FirstName
import com.gu.util.resthttp.HttpOp
import com.gu.util.resthttp.RestRequestMaker.{PatchRequest, RelativePath}
import play.api.libs.json.Json

object UpdateSalesforceIdentityId {

  case class WireRequest(IdentityID__c: String, FirstName: Option[String])
  implicit val writes = Json.writes[WireRequest]

  case class IdentityId(value: String) extends AnyVal
  case class SFContactUpdate(identityId: IdentityId, firstName: FirstName)

  def apply(patchOp: HttpOp[PatchRequest]): HttpOp[(SFContactId, Option[SFContactUpdate])] =
    patchOp.setupRequestMultiArg(toRequest)

  def toRequest(sFContactId: SFContactId, identityId: Option[SFContactUpdate]): PatchRequest = {
    val wireRequest = WireRequest(identityId.map(_.identityId.value).getOrElse(""), identityId.map(_.firstName.value))
    val relativePath = RelativePath(s"/services/data/v20.0/sobjects/Contact/${sFContactId.value}")
    PatchRequest(wireRequest, relativePath)
  }

}

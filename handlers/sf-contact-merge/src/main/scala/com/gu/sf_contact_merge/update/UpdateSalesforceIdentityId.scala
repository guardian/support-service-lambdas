package com.gu.sf_contact_merge.update

import com.gu.sf_contact_merge.getaccounts.GetContacts.{IdentityId, SFContactId}
import com.gu.util.resthttp.RestRequestMaker.{PatchRequest, RelativePath}
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.Json

object UpdateSalesforceIdentityId {

  case class WireRequest(IdentityID__c: String)
  implicit val writes = Json.writes[WireRequest]

  def apply(patch: PatchRequest => ClientFailableOp[Unit]): ((SFContactId, Option[IdentityId])) => ClientFailableOp[Unit] =
    (toRequest _).tupled.andThen(patch)

  def toRequest(sFContactId: SFContactId, identityId: Option[IdentityId]): PatchRequest =
    PatchRequest(WireRequest(identityId.map(_.value).getOrElse("")), RelativePath(s"services/data/v20.0/sobjects/Contact/${sFContactId.value}"))

}

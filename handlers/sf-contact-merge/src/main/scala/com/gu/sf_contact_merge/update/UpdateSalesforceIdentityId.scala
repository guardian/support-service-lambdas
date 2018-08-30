package com.gu.sf_contact_merge.update

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.FirstName
import com.gu.util.resthttp.HttpOp
import com.gu.util.resthttp.RestRequestMaker.{PatchRequest, RelativePath}
import play.api.libs.json.Json

object UpdateSalesforceIdentityId {

  case class WireRequest(IdentityID__c: String, FirstName: Option[String])
  implicit val writes = Json.writes[WireRequest]

  case class IdentityId(value: String) extends AnyVal

  sealed trait UpdateFirstName
  case class SetFirstName(firstName: FirstName) extends UpdateFirstName
  case object DummyFirstName extends UpdateFirstName
  case object DontChangeFirstName extends UpdateFirstName
  case class SFContactUpdate(identityId: Option[IdentityId], firstName: UpdateFirstName)

  def apply(patchOp: HttpOp[PatchRequest]): HttpOp[(SFContactId, SFContactUpdate)] =
    patchOp.setupRequestMultiArg(toRequest)

  def toRequest(sFContactId: SFContactId, contactUpdate: SFContactUpdate): PatchRequest = {
    val maybeFireFirstName = contactUpdate.firstName match {
      case SetFirstName(firstName) => Some(firstName.value)
      case DummyFirstName => Some(".")
      case DontChangeFirstName => None
    }
    val wireRequest = WireRequest(contactUpdate.identityId.map(_.value).getOrElse(""), maybeFireFirstName)
    val relativePath = RelativePath(s"/services/data/v20.0/sobjects/Contact/${sFContactId.value}")
    PatchRequest(wireRequest, relativePath)
  }

}

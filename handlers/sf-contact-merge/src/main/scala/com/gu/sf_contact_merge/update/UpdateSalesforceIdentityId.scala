package com.gu.sf_contact_merge.update

import com.gu.salesforce.SalesforceConstants.salesforceApiVersion
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.Types.IdentityId
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.{EmailAddress, FirstName}
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddressOverride.SFAddressOverride
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId.SFContactUpdate
import com.gu.util.resthttp.HttpOp
import com.gu.util.resthttp.RestRequestMaker.{PatchRequest, RelativePath}
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.Json

object UpdateSalesforceIdentityId {

  case class WireRequest(
      IdentityID__c: String,
      FirstName: Option[String],
      OtherStreet: Option[String], // billing
      OtherCity: Option[String],
      OtherState: Option[String],
      OtherPostalCode: Option[String],
      OtherCountry: Option[String],
      Phone: Option[String],
      Email: Option[String],
  )
  implicit val writes = Json.writes[WireRequest]

  sealed trait UpdateFirstName
  case class SetFirstName(firstName: FirstName) extends UpdateFirstName
  case object DummyFirstName extends UpdateFirstName
  case object DontChangeFirstName extends UpdateFirstName
  case class SFContactUpdate(
      identityId: Option[IdentityId],
      firstName: UpdateFirstName,
      maybeNewAddress: SFAddressOverride,
      maybeOverwriteEmailAddress: Option[EmailAddress],
  )

  def apply(patchOp: HttpOp[PatchRequest, Unit]): SetOrClearIdentityId =
    SetOrClearIdentityId(patchOp.setupRequestMultiArg(toRequest _).runRequestMultiArg)

  def toRequest(sFContactId: SFContactId, contactUpdate: SFContactUpdate): PatchRequest = {

    val wireIdentityId = contactUpdate.identityId.map(_.value).getOrElse("")
    val maybeFireFirstName = contactUpdate.firstName match {
      case SetFirstName(firstName) => Some(firstName.value)
      case DummyFirstName => Some(".")
      case DontChangeFirstName => None
    }
    val wireRequest = WireRequest(
      wireIdentityId,
      maybeFireFirstName,
      contactUpdate.maybeNewAddress.toOption.map(_.OtherStreet.value),
      contactUpdate.maybeNewAddress.toOption.flatMap(_.OtherCity.map(_.value)),
      contactUpdate.maybeNewAddress.toOption.flatMap(_.OtherState.map(_.value)),
      contactUpdate.maybeNewAddress.toOption.flatMap(_.OtherPostalCode.map(_.value)),
      contactUpdate.maybeNewAddress.toOption.map(_.OtherCountry.value),
      contactUpdate.maybeNewAddress.toOption.flatMap(_.Phone.map(_.value)),
      contactUpdate.maybeOverwriteEmailAddress.map(_.value),
    )

    val relativePath = RelativePath(s"/services/data/v$salesforceApiVersion/sobjects/Contact/${sFContactId.value}")
    PatchRequest(wireRequest, relativePath)
  }

}

case class SetOrClearIdentityId(apply: (SFContactId, SFContactUpdate) => ClientFailableOp[Unit])

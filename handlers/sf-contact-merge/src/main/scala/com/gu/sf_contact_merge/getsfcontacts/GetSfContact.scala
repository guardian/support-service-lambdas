package com.gu.sf_contact_merge.getsfcontacts

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.Types.IdentityId
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.EmailAddress
import com.gu.sf_contact_merge.getsfcontacts.GetSfContact.SFAddressFields._
import com.gu.sf_contact_merge.getsfcontacts.GetSfContact.SFContact
import com.gu.util.resthttp.RestOp.HttpOpParseOp
import com.gu.util.resthttp.RestRequestMaker.{GetRequest, RelativePath}
import com.gu.util.resthttp.{HttpOp, LazyClientFailableOp}
import play.api.libs.json.{JsValue, Json}

object GetSfContact {

  object SFAddressFields {

    case class SFStreet(value: String) extends AnyVal
    case class SFCity(value: String) extends AnyVal
    case class SFState(value: String) extends AnyVal
    case class SFPostalCode(value: String) extends AnyVal
    case class SFCountry(value: String) extends AnyVal
    case class SFPhone(value: String) extends AnyVal

  }

  case class SFAddress( //minimal useful address needs the street and country
    OtherStreet: SFStreet,
    OtherCity: Option[SFCity],
    OtherState: Option[SFState],
    OtherPostalCode: Option[SFPostalCode],
    OtherCountry: SFCountry,
    Phone: Option[SFPhone]
  )

  case class EmailIdentity(address: EmailAddress, identityId: Option[IdentityId])

  case class WireResult(
    OtherStreet: Option[String], // billing
    OtherCity: Option[String],
    OtherState: Option[String],
    OtherPostalCode: Option[String],
    OtherCountry: Option[String],
    Phone: Option[String],
    Digital_Voucher_User__c: Boolean,
    Email: String,
    IdentityID__c: Option[String]
  )
  implicit val wireResultReads = Json.reads[WireResult]

  def apply(getOp: HttpOp[GetRequest, JsValue]): GetSfContact =
    new GetSfContact(getOp.setupRequest(toRequest).parse[WireResult].map(toResponse).runRequestLazy)

  def toResponse(wireResult: WireResult): SFContact =
    SFContact(
      toMaybeAddress(wireResult),
      IsDigitalVoucherUser(wireResult.Digital_Voucher_User__c),
      EmailIdentity(EmailAddress(wireResult.Email), wireResult.IdentityID__c.map(IdentityId))
    )

  def toMaybeAddress(wireResult: WireResult): SFMaybeAddress = {
    import wireResult._
    val maybeAddress = for {
      street <- OtherStreet.filter(_.length > 1) // could just be a comma or dot
      country <- OtherCountry
    } yield SFAddress(
      SFStreet(street),
      OtherCity.map(SFCity),
      OtherState.map(SFState),
      OtherPostalCode.map(SFPostalCode),
      SFCountry(country),
      Phone.map(SFPhone)
    )
    maybeAddress match {
      case Some(address) => UsableContactAddress(address)
      case None => UnusableContactAddress
    }
  }

  case class SFContact(
    SFMaybeAddress: SFMaybeAddress,
    isDigitalVoucherUser: IsDigitalVoucherUser,
    emailIdentity: EmailIdentity
  )

  case class IsDigitalVoucherUser(value: Boolean) extends AnyVal

  sealed abstract class SFMaybeAddress
  case class UsableContactAddress(sfAddress: SFAddress) extends SFMaybeAddress
  case object UnusableContactAddress extends SFMaybeAddress

  def toRequest(sfContactId: SFContactId) = GetRequest(RelativePath(s"/services/data/v43.0/sobjects/Contact/${sfContactId.value}"))

}

case class GetSfContact(apply: SFContactId => LazyClientFailableOp[SFContact])

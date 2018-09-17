package com.gu.sf_contact_merge.getsfcontacts

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddress.SFAddress
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddress.SFAddressFields._
import com.gu.util.resthttp.HttpOp
import com.gu.util.resthttp.RestOp.HttpOpParseOp
import com.gu.util.resthttp.RestRequestMaker.{GetRequest, RelativePath}
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.{JsValue, Json}

object GetSfAddress {

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

  case class WireResult(
    OtherStreet: Option[String], // billing
    OtherCity: Option[String],
    OtherState: Option[String],
    OtherPostalCode: Option[String],
    OtherCountry: Option[String],
    Phone: Option[String]
  )
  implicit val wireResultReads = Json.reads[WireResult]

  def apply(getOp: HttpOp[GetRequest, JsValue]): GetSfAddress =
    new GetSfAddress(getOp.setupRequest(toRequest).parse[WireResult].map(toResponse).runRequest)

  def toResponse(wireResult: WireResult): Option[SFAddress] = {
    import wireResult._
    for {
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
  }

  def toRequest(sfContactId: SFContactId) = GetRequest(RelativePath(s"/services/data/v43.0/sobjects/Contact/${sfContactId.value}"))
}

case class GetSfAddress(apply: SFContactId => ClientFailableOp[Option[SFAddress]])

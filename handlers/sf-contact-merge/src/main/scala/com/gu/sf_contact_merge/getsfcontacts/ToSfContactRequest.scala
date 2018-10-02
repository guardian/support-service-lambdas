package com.gu.sf_contact_merge.getsfcontacts

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.util.resthttp.RestRequestMaker.{GetRequest, RelativePath}
import play.api.libs.json.Json

object ToSfContactRequest {

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

  def apply(sfContactId: SFContactId) = GetRequest(RelativePath(s"/services/data/v43.0/sobjects/Contact/${sfContactId.value}"))

}

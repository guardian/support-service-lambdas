package com.gu.identityBackfill.salesforce

import com.gu.i18n.CountryGroup
import com.gu.identityBackfill.salesforce.ContactSyncCheck.RecordTypeId
import com.gu.identityBackfill.salesforce.GetSFContactSyncCheckFields.ContactSyncCheckFields
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp._
import com.gu.util.resthttp.RestOp.HttpOpParseOp
import com.gu.util.resthttp.RestRequestMaker.{GetRequest, RelativePath}
import com.gu.util.resthttp.{HttpOp, LazyClientFailableOp}
import play.api.libs.json.{JsValue, Json}

object GetSFContactSyncCheckFields {

  case class ContactSyncCheckFields(
    RecordTypeId: Option[String],
    LastName: String,
    FirstName: String,
    OtherCountry: Option[String]
  )
  implicit val reads = Json.reads[ContactSyncCheckFields]

  def apply(getOp: HttpOp[GetRequest, JsValue]): GetSFContactSyncCheckFields =
    new GetSFContactSyncCheckFields(getOp.setupRequest(toRequest).parse[ContactSyncCheckFields].runRequestLazy)

  def toRequest(sfContactId: SFContactId) = GetRequest(RelativePath(s"/services/data/v43.0/sobjects/Contact/${sfContactId.value}"))

}

case class GetSFContactSyncCheckFields(apply: SFContactId => LazyClientFailableOp[ContactSyncCheckFields])

object ContactSyncCheck {

  case class RecordTypeId(value: String) // this lets us decide whether it's a related or primary contact

  def apply(
    standardRecordType: RecordTypeId
  )(
    contactSyncCheckFields: GetSFContactSyncCheckFields.ContactSyncCheckFields
  ): Boolean = {
    val correctRecordType = contactSyncCheckFields.RecordTypeId.contains(standardRecordType.value)
    val hasFirstName = contactSyncCheckFields.FirstName.trim != ""
    val hasLastName = contactSyncCheckFields.LastName.trim != ""
    val country = contactSyncCheckFields.OtherCountry.getOrElse("")
    val countryIsValid = country.trim != "" &&
      CountryGroup.byOptimisticCountryNameOrCode(country).isDefined
    correctRecordType && hasFirstName && hasLastName && countryIsValid
  }

}

object SyncableSFToIdentity {
  def apply(
    standardRecordType: RecordTypeId
  )(
    fields: ContactSyncCheckFields
  )(
    sFContactId: SFContactId
  ) =
    for {
      _ <- if (ContactSyncCheck(standardRecordType)(fields))
        ContinueProcessing(())
      else
        ReturnWithResponse(ApiGatewayResponse.notFound("this sf contact can't be synced back to zuora/identity"))
    } yield ()
}

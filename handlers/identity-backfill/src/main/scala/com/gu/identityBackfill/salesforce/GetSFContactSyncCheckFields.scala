package com.gu.identityBackfill.salesforce

import com.gu.i18n.CountryGroup
import com.gu.identityBackfill.Types.SFContactId
import com.gu.identityBackfill.salesforce.ContactSyncCheck.RecordTypeId
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp._
import com.gu.util.zuora.RestRequestMaker
import com.gu.util.zuora.RestRequestMaker.ClientFailableOp
import play.api.libs.json.Json
import com.gu.identityBackfill.TypeConvert._

object GetSFContactSyncCheckFields {

  case class ContactSyncCheckFields(
    RecordTypeId: Option[String],
    LastName: String,
    FirstName: String,
    OtherCountry: Option[String]
  )
  implicit val reads = Json.reads[ContactSyncCheckFields]

  def apply(sfRequests: RestRequestMaker.Requests)(sFContactId: SFContactId): ClientFailableOp[ContactSyncCheckFields] =
    sfRequests.get[ContactSyncCheckFields](s"/services/data/v20.0/sobjects/Contact/${sFContactId.value}")

}

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
    sfRequests: RestRequestMaker.Requests
  )(
    sFContactId: SFContactId
  ) =
    for {
      fields <- GetSFContactSyncCheckFields(sfRequests)(sFContactId).toApiGatewayOp("zuora issue")
      _ <- if (ContactSyncCheck(standardRecordType)(fields))
        ContinueProcessing(())
      else
        ReturnWithResponse(ApiGatewayResponse.notFound("this sf contact can't be synced back to zuora/identity"))
    } yield ()
}

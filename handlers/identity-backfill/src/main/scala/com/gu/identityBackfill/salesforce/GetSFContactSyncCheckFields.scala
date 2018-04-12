package com.gu.identityBackfill.salesforce

import com.gu.i18n.CountryGroup
import com.gu.identityBackfill.Types.SFContactId
import com.gu.identityBackfill.salesforce.ContactSyncCheck.RecordTypeId
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.FailableOp
import com.gu.util.zuora.RestRequestMaker
import play.api.libs.json.Json
import scalaz.{-\/, \/-}

object GetSFContactSyncCheckFields {

  case class ContactSyncCheckFields(
    RecordTypeId: Option[String],
    LastName: String,
    FirstName: String,
    OtherCountry: Option[String]
  )
  implicit val reads = Json.reads[ContactSyncCheckFields]

  def apply(sfRequests: RestRequestMaker.Requests)(sFContactId: SFContactId): FailableOp[ContactSyncCheckFields] = {
    val get = sfRequests.get[ContactSyncCheckFields](s"/services/data/v20.0/sobjects/Contact/${sFContactId.value}")
    get.leftMap(e => ApiGatewayResponse.internalServerError(e.message))
  }

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
    maybeSFRequests: FailableOp[RestRequestMaker.Requests],
    standardRecordType: RecordTypeId
  )(
    sFContactId: SFContactId
  ) =
    for {
      sfRequests <- maybeSFRequests
      fields <- GetSFContactSyncCheckFields.apply(sfRequests)(sFContactId)
      _ <- if (ContactSyncCheck.apply(standardRecordType)(fields))
        \/-(())
      else
        -\/(ApiGatewayResponse.notFound("this sf contact can't be synced back to zuora/identity"))
    } yield ()
}

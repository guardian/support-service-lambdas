package com.gu.identityBackfill.salesforce

import com.gu.i18n.CountryGroup
import com.gu.identityBackfill.salesforce.ContactSyncCheck.RecordTypeId
import com.gu.identityBackfill.salesforce.GetSFContactSyncCheckFields.{ContactSyncCheckFields, ContactsByAccountIdQueryResponse}
import com.gu.salesforce.TypesForSFEffectsData.{SFAccountId, SFContactId}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types
import com.gu.util.reader.Types.ApiGatewayOp._
import com.gu.util.resthttp.RestOp.HttpOpParseOp
import com.gu.util.resthttp.RestRequestMaker.{GetRequest, RelativePath}
import com.gu.util.resthttp.{HttpOp, LazyClientFailableOp}
import play.api.libs.json.{JsValue, Json}

object GetSFContactSyncCheckFields {

  case class ContactSyncCheckFields(
    Id: String,
    RecordTypeId: Option[String],
    LastName: String,
    FirstName: String,
    OtherCountry: Option[String],
    Email: Option[String]
  )

  case class ContactsByAccountIdQueryResponse(
    totalSize: Int,
    done: Boolean,
    records: List[ContactSyncCheckFields]
  )

  implicit val readContactSyncCheckFields = Json.reads[ContactSyncCheckFields]
  implicit val readQuery = Json.reads[ContactsByAccountIdQueryResponse]

  def apply(getOp: HttpOp[GetRequest, JsValue]): GetSFContactSyncCheckFields = {
    new GetSFContactSyncCheckFields(getOp.setupRequest(toRequest).parse[ContactsByAccountIdQueryResponse].runRequestLazy)
  }

  def toRequest(sfAccountId: SFAccountId) =
    GetRequest(
      RelativePath(
        s"/services/data/v43.0/query?q=SELECT Id, RecordTypeId, LastName, FirstName, OtherCountry, Email FROM Contact WHERE AccountId = '${sfAccountId.value}'"
      )
    )

}

case class GetSFContactSyncCheckFields(apply: SFAccountId => LazyClientFailableOp[ContactsByAccountIdQueryResponse])

object ContactSyncCheck {

  case class RecordTypeId(value: String) // this lets us decide whether it's a related or primary contact

  def apply(
    standardRecordType: RecordTypeId
  )(
    queryResponse: GetSFContactSyncCheckFields.ContactsByAccountIdQueryResponse
  ): Option[SFContactId] = {

    def correctRecordType(fields: ContactSyncCheckFields) = fields.RecordTypeId.contains(standardRecordType.value)

    queryResponse.records.filter(correctRecordType) match {
      case List(contactSyncCheckFields) => {
        val hasFirstName = contactSyncCheckFields.FirstName.trim != ""
        val hasLastName = contactSyncCheckFields.LastName.trim != ""
        val email = contactSyncCheckFields.Email.getOrElse("").trim
        val emailIsValid = email.length > 3 && email.contains("@")
        val country = contactSyncCheckFields.OtherCountry.getOrElse("")
        val countryIsValid = country.trim != "" && CountryGroup.byOptimisticCountryNameOrCode(country).isDefined
        if (hasFirstName && hasLastName && emailIsValid && countryIsValid) Some(SFContactId(contactSyncCheckFields.Id)) else None
      }
      case _ => None
    }
  }

}

object SyncableSFToIdentity {
  def apply(
    standardRecordType: RecordTypeId
  )(
    fields: ContactsByAccountIdQueryResponse
  ): Types.ApiGatewayOp[Option[SFContactId]] = {
    val maybeSyncableContact = ContactSyncCheck(standardRecordType)(fields)
    if (maybeSyncableContact.nonEmpty) ContinueProcessing(maybeSyncableContact) else {
      ReturnWithResponse(ApiGatewayResponse.notFound("this sf contact can't be synced back to zuora/identity"))
    }
  }
}

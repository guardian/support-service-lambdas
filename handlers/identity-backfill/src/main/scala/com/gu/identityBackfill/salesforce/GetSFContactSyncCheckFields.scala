package com.gu.identityBackfill.salesforce

import com.gu.i18n.CountryGroup
import com.gu.identityBackfill.salesforce.ContactSyncCheck.RecordTypeId
import com.gu.identityBackfill.salesforce.GetSFContactSyncCheckFields.ContactSyncCheckFields
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
    new GetSFContactSyncCheckFields(getOp.setupRequest(toRequest).parse[ContactsByAccountIdQueryResponse].map(_.records).runRequestLazy)
  }

  def toRequest(sfAccountId: SFAccountId) =
    GetRequest(
      RelativePath(
        s"/services/data/v43.0/query?q=SELECT Id, RecordTypeId, LastName, FirstName, OtherCountry, Email FROM Contact " +
          s"WHERE AccountId = '${sfAccountId.value}'"
      )
    )

}

case class GetSFContactSyncCheckFields(apply: SFAccountId => LazyClientFailableOp[List[ContactSyncCheckFields]])

object ContactSyncCheck {

  case class RecordTypeId(value: String) // this lets us decide whether it's a related or primary contact

  def apply(
    standardRecordType: RecordTypeId
  )(
    contactSyncCheckFields: List[GetSFContactSyncCheckFields.ContactSyncCheckFields]
  ): Either[String, SFContactId] = {

    def isStandardContact(fields: ContactSyncCheckFields) = fields.RecordTypeId.contains(standardRecordType.value)

    contactSyncCheckFields.filter(isStandardContact) match {
      case fields :: Nil => {
        val email = fields.Email.getOrElse("")
        val emailIsValid = email.length > 3 && email.contains("@")
        val country = fields.OtherCountry.getOrElse("").trim
        val countryIsValid = country.nonEmpty && CountryGroup.byOptimisticCountryNameOrCode(country).isDefined
        if (fields.FirstName.trim.isEmpty) {
          Left(s"Contact ${fields.Id} is not syncable - does not have a first name")
        } else if (fields.LastName.trim.isEmpty) {
          Left(s"Contact ${fields.Id} is not syncable - does not have a last name")
        } else if (!emailIsValid) {
          Left(s"Contact ${fields.Id} is not syncable - does not have a valid email address: $email")
        } else if (!countryIsValid) {
          Left(s"Contact ${fields.Id} is not syncable - does not have a valid country: $country")
        } else {
          Right(SFContactId(fields.Id))
        }
      }
      case _ :: _ :: Nil =>
        Left(s"There are more than one syncable SF Contacts within this SF Account: ${contactSyncCheckFields.map(_.Id)}")
      case Nil if contactSyncCheckFields.nonEmpty =>
        Left(s"There are no syncable SF Contacts within the customer's account: ${contactSyncCheckFields.map(_.Id).mkString(", ")}")
      case Nil if contactSyncCheckFields.isEmpty =>
        Left(s"There are no SF Contacts within the customer's account")
      case _ =>
        Left(s"Syncable SF Contact did not meet validation: ${contactSyncCheckFields.map(_.Id)}") // should never happen!
    }
  }

}

object GetSFBillingContactIfSyncable {
  def apply(
    standardRecordType: RecordTypeId
  )(
    fields: List[ContactSyncCheckFields]
  ): Types.ApiGatewayOp[Option[SFContactId]] = {
    val syncableContactOrError = ContactSyncCheck(standardRecordType)(fields)
    syncableContactOrError match {
      case Left(reason) => ReturnWithResponse(ApiGatewayResponse.notFound(s"Unable to select SF Contact to update. Reason: $reason"))
      case Right(contactId) => ContinueProcessing(Some(contactId))
    }
  }
}

package com.gu.delivery_records_api.service.createproblem

import com.gu.salesforce.SalesforceConstants.sfObjectsBaseUrl
import com.gu.salesforce.sttp.{SFApiCompositePart, SFApiCompositeRequest}
import com.gu.salesforce.{Contact, IdentityId, SalesforceContactId}
import io.circe.Encoder
import io.circe.generic.auto._
import io.circe.syntax._

import java.time.{LocalDate, LocalDateTime}

object SFApiCreateDeliveryProblem {

  def create(
      subscriptionNumber: String,
      contact: Contact,
      detail: CreateDeliveryProblem,
      now: LocalDateTime = LocalDateTime.now(),
  ): SFApiCompositeRequest[SFApiCompositePartBody] = SFApiCompositeRequest[SFApiCompositePartBody](
    allOrNone = true,
    // this is needed so ID of case creation can be injected into the parts that link delivery records
    collateSubrequests = false,
    compositeRequest = List(
      SFApiCompositePart[SFApiCompositePartBody](
        referenceId = "CaseCreation",
        method = "POST",
        url = s"${sfObjectsBaseUrl}Case",
        body = SFApiCreateDeliveryProblemCase(
          Subject =
            s"[Self Service] Delivery Problem : ${detail.problemType} (${detail.productName} - $subscriptionNumber)",
          Description = detail.description,
          Case_Journey__c = "Self Service",
          Product__c = detail.productName,
          Category__c = "Delivery & Fulfilment",
          Sub_Category__c = detail.problemType,
          Contact = contact match {
            case IdentityId(identityId) => Some(Contact_ByIdentityId(identityId))
            case _ => None
          },
          ContactId = contact match {
            case SalesforceContactId(sfContactId) => Some(sfContactId)
            case _ => None
          },
          SF_Subscription__r = SF_Subscription_ByName(
            Name = subscriptionNumber,
          ),
          Repeat_Delivery_Issue__c = detail.repeatDeliveryProblem.contains(true),
          Status = detail.status,
          Priority = detail.priority,
        ),
      ),
    ) ++ detail.deliveryRecords.map(deliveryRecord =>
      SFApiCompositePart[SFApiCompositePartBody](
        referenceId = s"LinkDeliveryRecord_${deliveryRecord.id}",
        method = "PATCH",
        url = s"${sfObjectsBaseUrl}Delivery__c/${deliveryRecord.id}",
        body = SFApiLinkDeliveryRecord(
          // this case id is injected by SF based on the the composite request first creating a SFApiDeliveryProblemCase
          Case__c = "@{CaseCreation.id}",
          Credit_Amount__c = deliveryRecord.creditAmount,
          Invoice_Date__c = deliveryRecord.invoiceDate,
          Credit_Requested_On__c = deliveryRecord.creditAmount.map(_ => now),
        ),
      ),
    ) ++ detail.newContactPhoneNumbers
      .map(contactPhoneNumbers =>
        SFApiCompositePart[SFApiCompositePartBody](
          referenceId = "UpdateContactPhoneNumbers",
          method = "PATCH",
          url = s"${sfObjectsBaseUrl}Contact/${contactPhoneNumbers.Id.get}",
          body = contactPhoneNumbers.filterOutGarbage().copy(Id = None),
        ),
      )
      .toList,
  )

}

case class SFApiDeliveryProblemCase(
    Id: String,
    CaseNumber: String,
    Subject: Option[String],
    Description: Option[String],
    Sub_Category__c: Option[
      String,
    ],
)

case class Contact_ByIdentityId(
    IdentityID__c: String,
)

case class SF_Subscription_ByName(
    Name: String,
)

sealed trait SFApiCompositePartBody

case class SFApiCreateDeliveryProblemCase(
    Contact: Option[Contact_ByIdentityId],
    ContactId: Option[String],
    SF_Subscription__r: SF_Subscription_ByName,
    Origin: String = "Self Service",
    Case_Journey__c: String = "Self Service",
    Status: String,
    Priority: Option[String],
    Subject: String,
    Description: Option[String],
    Product__c: String,
    Category__c: String = "Delivery & Fulfilment",
    Sub_Category__c: String,
    Repeat_Delivery_Issue__c: Boolean,
) extends SFApiCompositePartBody

case class SFApiLinkDeliveryRecord(
    Case__c: String,
    Credit_Amount__c: Option[Double],
    Invoice_Date__c: Option[LocalDate],
    Credit_Requested_On__c: Option[LocalDateTime],
) extends SFApiCompositePartBody

object SFApiCompositePartBody {
  // this encoder needs to be defined, otherwise circe wraps the case classes with their name (as a discriminator)
  implicit val encoder: Encoder[SFApiCompositePartBody] = Encoder.instance[SFApiCompositePartBody] {
    case caseBody: SFApiCreateDeliveryProblemCase => caseBody.asJson
    case linkRecordBody: SFApiLinkDeliveryRecord => linkRecordBody.asJson
    case contactPhoneNumbers: SFApiContactPhoneNumbers => contactPhoneNumbers.asJson
    case _ => throw new RuntimeException("non-exhaustive pattern match for SFApiCompositePartBody Encoder")
  }
}

case class SFApiContactPhoneNumbers(
    Id: Option[String],
    Phone: Option[String] = None,
    HomePhone: Option[String] = None,
    MobilePhone: Option[String] = None,
    OtherPhone: Option[String] = None,
) extends SFApiCompositePartBody {

  private def validator(trimmedValue: String) =
    trimmedValue.nonEmpty && trimmedValue.matches("[+\\-\\d\\s]+")

  def filterOutGarbage(): SFApiContactPhoneNumbers = copy(
    Phone = Phone.map(_.trim).filter(validator),
    HomePhone = HomePhone.map(_.trim).filter(validator),
    MobilePhone = MobilePhone.map(_.trim).filter(validator),
    OtherPhone = OtherPhone.map(_.trim).filter(validator),
  )

}

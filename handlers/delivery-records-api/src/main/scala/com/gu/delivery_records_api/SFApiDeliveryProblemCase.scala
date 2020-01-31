package com.gu.delivery_records_api

import com.gu.salesforce.SalesforceConstants.sfObjectsBaseUrl
import com.gu.salesforce.sttp.{SFApiCompositePart, SFApiCompositeRequest}
import com.gu.salesforce.{Contact, IdentityId, SalesforceContactId}
import io.circe.Encoder
import io.circe.generic.auto._
import io.circe.syntax._

case class SFApiDeliveryProblemCase(
  Id: String,
  Subject: Option[String],
  Description: Option[String],
  Case_Closure_Reason__c: Option[String] // this is actually the case sub-category (e.g. 'No Delivery', 'Damaged Delivery' etc.)
)

case class Contact_ByIdentityId(
  IdentityID__c: String
)

case class SF_Subscription_ByName(
  Name: String
)

sealed trait SFApiCompositePartBody

case class SFApiCreateDeliveryProblemCase(
  Contact: Option[Contact_ByIdentityId],
  ContactId: Option[String],
  SF_Subscription__r: SF_Subscription_ByName,
  Origin: String = "Self Service",
  Status: String = "New",
  Subject: String,
  Description: Option[String],
  Product__c: String,
  Journey__c: String,
  Enquiry_Type__c: String = "Delivery issues",
  Case_Closure_Reason__c: String,
) extends SFApiCompositePartBody

case class SFApiLinkDeliveryRecord(
  Case__c: String
) extends SFApiCompositePartBody

object SFApiCompositePartBody {
  // this encoder needs to be defined, otherwise circe wraps the case classes with their name (as a discriminator)
  implicit val encoder: Encoder[SFApiCompositePartBody] = Encoder.instance[SFApiCompositePartBody]{
    case caseBody: SFApiCreateDeliveryProblemCase => caseBody.asJson
    case linkRecordBody: SFApiLinkDeliveryRecord => linkRecordBody.asJson
  }
}

object SFApiCompositeCreateDeliveryProblem {
  def apply(
    subscriptionNumber: String,
    contact: Contact,
    productName: String,
    description: Option[String],
    problemType: String,
    recordIds: List[String]
  ) = SFApiCompositeRequest[SFApiCompositePartBody](
    allOrNone = true,
    // this is needed so ID of case creation can be injected into the parts that link delivery records
    collateSubrequests = false,
    compositeRequest = List(SFApiCompositePart[SFApiCompositePartBody](
      referenceId = "CaseCreation",
      method = "POST",
      url = s"${sfObjectsBaseUrl}Case",
      body = SFApiCreateDeliveryProblemCase(
        Subject = s"[Self Service] Delivery Problem : $problemType ($productName - $subscriptionNumber)",
        Description = description,
        Case_Closure_Reason__c = problemType,
        Product__c = productName,
        Journey__c = s"CS - $productName Support",
        Contact = contact match {
          case IdentityId(identityId) => Some(Contact_ByIdentityId(identityId))
          case _ => None
        },
        ContactId = contact match {
          case SalesforceContactId(sfContactId) => Some(sfContactId)
          case _ => None
        },
        SF_Subscription__r = SF_Subscription_ByName(
          Name = subscriptionNumber
        )
      )
    )) ++ recordIds.map(recordId => SFApiCompositePart[SFApiCompositePartBody](
      referenceId = s"LinkDeliveryRecord-$recordId",
      method = "PATCH",
      url = s"${sfObjectsBaseUrl}Delivery__c/$recordId",
      // this case id is injected by SF based on the the composite request first creating a SFApiDeliveryProblemCase
      body = SFApiLinkDeliveryRecord(
        "@{CaseCreation.id}"
      )
    ))
  )

}
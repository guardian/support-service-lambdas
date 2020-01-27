package com.gu.deliveryproblemcreditprocessor

import com.gu.salesforce.RecordsWrapperCaseClass
import com.gu.zuora.subscription.{AffectedPublicationDate, CreditRequest, RatePlanChargeCode, SubscriptionName}
import play.api.libs.json.{Json, Reads}

case class DeliveryCreditRequest(
  Id: DeliveryId,
  SF_Subscription__r: DeliveryCreditSubscription,
  Delivery_Date__c: AffectedPublicationDate,
  Charge_Code__c: Option[RatePlanChargeCode]
) extends CreditRequest {
  val subscriptionName: SubscriptionName = SF_Subscription__r.Name
  val publicationDate: AffectedPublicationDate = Delivery_Date__c
  val chargeCode: Option[RatePlanChargeCode] = Charge_Code__c
  val productRatePlanChargeName: String = DeliveryCreditProduct.ratePlanChargeName
}

object DeliveryCreditRequest {

  implicit val reads: Reads[DeliveryCreditRequest] = Json.reads[DeliveryCreditRequest]

  implicit val wrapperReads: Reads[RecordsWrapperCaseClass[DeliveryCreditRequest]] =
    Json.reads[RecordsWrapperCaseClass[DeliveryCreditRequest]]
}

case class DeliveryCreditSubscription(Name: SubscriptionName)

object DeliveryCreditSubscription {
  implicit val reads: Reads[DeliveryCreditSubscription] = Json.reads[DeliveryCreditSubscription]
}

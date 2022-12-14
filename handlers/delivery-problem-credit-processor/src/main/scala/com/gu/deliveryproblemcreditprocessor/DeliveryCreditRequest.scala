package com.gu.deliveryproblemcreditprocessor

import java.time.LocalDate

import com.gu.zuora.subscription.{AffectedPublicationDate, CreditRequest, RatePlanChargeCode, SubscriptionName}

case class DeliveryCreditRequest(
    Id: String,
    SF_Subscription__r: DeliveryCreditSubscription,
    Delivery_Date__c: LocalDate,
    Charge_Code__c: Option[String],
    Invoice_Date__c: Option[LocalDate],
) extends CreditRequest {
  val subscriptionName: SubscriptionName = SubscriptionName(SF_Subscription__r.Name)
  val publicationDate: AffectedPublicationDate = AffectedPublicationDate(Delivery_Date__c)
  val chargeCode: Option[RatePlanChargeCode] = Charge_Code__c.map(RatePlanChargeCode(_))
  val productRatePlanChargeName: String = DeliveryCreditProduct.ratePlanChargeName
}

case class DeliveryCreditSubscription(Name: String)

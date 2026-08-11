package com.gu.zuora.subscription

trait CreditRequest {

  def subscriptionName: SubscriptionName
  def publicationDate: AffectedPublicationDate

  /** If actioned, this will be populated with the unique code that identifies the rate plan charge added to the sub.
    */
  def chargeCode: Option[RatePlanChargeCode]

  def productRatePlanChargeName: String
}

package com.gu.zuora.subscription

/** Request to add a credit amendment to a Zuora subscription.
  */
trait CreditRequest {

  def subscriptionName: SubscriptionName
  def publicationDate: AffectedPublicationDate

  /** If actioned, this will be populated with the unique code that identifies the rate plan charge added to the sub.
    */
  def chargeCode: Option[RatePlanChargeCode]

  /** This is used to inspect a subscription to see if a credit amendment has already been added.
    */
  def productRatePlanChargeName: String
}

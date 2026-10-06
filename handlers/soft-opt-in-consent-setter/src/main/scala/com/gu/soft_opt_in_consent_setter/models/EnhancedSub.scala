package com.gu.soft_opt_in_consent_setter.models

case class EnhancedSub(identityId: String, productsWithSecondaryAccess: Set[String])

object EnhancedSub {

  // the scheduled batch path (Salesforce-sourced)
  // TODO work out why doesn't it consider IAP subs at this point?
  def fromSF(
      sub: SFSubRecord,
      associatedSubs: Seq[SFAssociatedSubRecord],
      activeSecondarySubscriptionNames: Set[String],
  ): EnhancedSub = {
    val productNames = associatedSubs
      .filter(_.IdentityID__c.equals(sub.Buyer__r.IdentityID__c))
      .map(_.Product__c)
      .toSet

    EnhancedSub(
      sub.Buyer__r.IdentityID__c,
      withSecondaryAccess(productNames, activeSecondarySubscriptionNames, sub.Name),
    )
  }

  // the SQS/IAP-driven path
  def fromSQS(
      identityId: String,
      activeSubs: Seq[SFAssociatedSubRecord],
      iapProductNames: Seq[String],
      activeSecondarySubscriptionNames: Set[String],
      subscriptionId: String,
  ): EnhancedSub = {
    val productNames = activeSubs.map(_.Product__c).toSet ++ iapProductNames
    EnhancedSub(identityId, withSecondaryAccess(productNames, activeSecondarySubscriptionNames, subscriptionId))
  }

  // a user has secondary access if they have active secondary access to a subscription
  // other than the one currently being processed
  private def withSecondaryAccess(
      productNames: Set[String],
      activeSecondarySubscriptionNames: Set[String],
      currentSubscriptionName: String,
  ): Set[String] = {
    val hasOtherSecondaryAccess = activeSecondarySubscriptionNames.exists(_ != currentSubscriptionName)
    if (hasOtherSecondaryAccess) productNames + ConsentsMapping.secondaryDigitalAccessProductName else productNames
  }
}

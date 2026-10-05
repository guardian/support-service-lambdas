package com.gu.soft_opt_in_consent_setter.models

case class EnhancedSub(
    identityId: String,
    productsWithSecondaryAccess: Set[String],
)

object EnhancedSub {

  private def build(
      identityId: String,
      subName: String,
      activeProductNames: Set[String],
      activeSecondarySubscriptionNames: Set[String],
  ): EnhancedSub = {
    val hasOtherSecondaryAccess: Boolean = activeSecondarySubscriptionNames.exists(_ != subName)
    val productsWithSecondaryAccess =
      if (hasOtherSecondaryAccess) activeProductNames + "Secondary User" else activeProductNames

    EnhancedSub(identityId, productsWithSecondaryAccess)
  }

  def fromSF(
      sub: SFSubRecord,
      associatedSubs: Seq[SFAssociatedSubRecord],
      activeSecondarySubscriptionNames: Set[String],
  ): EnhancedSub = {
    val activeProductNames =
      associatedSubs
        .filter(_.IdentityID__c.equals(sub.Buyer__r.IdentityID__c))
        .map(_.Product__c)
        .toSet

    build(sub.Buyer__r.IdentityID__c, sub.Name, activeProductNames, activeSecondarySubscriptionNames)
  }

  def fromSQS(
      identityId: String,
      subName: String,
      associatedSubs: Seq[SFAssociatedSubRecord],
      iapSoftOptInProductNames: Seq[String],
      activeSecondarySubscriptionNames: Set[String],
  ): EnhancedSub = {
    val activeProductNames = associatedSubs.map(_.Product__c).toSet ++ iapSoftOptInProductNames
    build(identityId, subName, activeProductNames, activeSecondarySubscriptionNames)
  }
}

package com.gu.soft_opt_in_consent_setter.models

case class EnhancedSub(
    identityId: String,
    sub: SFSubRecord,
    associatedActiveNonGiftSubs: Seq[SFAssociatedSubRecord],
    activeSecondarySubscriptionNames: Set[String],
) {
  def hasOtherSecondaryAccess: Boolean = activeSecondarySubscriptionNames.exists(_ != sub.Name)
}

object EnhancedSub {
  def apply(
      sub: SFSubRecord,
      associatedSubs: Seq[SFAssociatedSubRecord],
      activeSecondarySubscriptionNames: Set[String],
  ): EnhancedSub = {
    val associatedActiveNonGiftSubs =
      associatedSubs
        .filter(_.IdentityID__c.equals(sub.Buyer__r.IdentityID__c))

    EnhancedSub(
      identityId = sub.Buyer__r.IdentityID__c,
      sub = sub,
      associatedActiveNonGiftSubs = associatedActiveNonGiftSubs,
      activeSecondarySubscriptionNames = activeSecondarySubscriptionNames,
    )
  }
}

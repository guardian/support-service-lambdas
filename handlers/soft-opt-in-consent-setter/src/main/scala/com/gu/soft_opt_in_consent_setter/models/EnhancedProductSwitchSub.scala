package com.gu.soft_opt_in_consent_setter.models

case class EnhancedProductSwitchSub(
    identityId: String,
    productSwitchSub: SubscriptionRatePlanUpdateRecord,
    associatedActiveNonGiftSubs: Seq[SFAssociatedSubRecord],
)

object EnhancedProductSwitchSub {
  def apply(
      productSwitchSub: SubscriptionRatePlanUpdateRecord,
      associatedSubs: Seq[SFAssociatedSubRecord],
  ): EnhancedProductSwitchSub = {
    val associatedActiveNonGiftSubs =
      associatedSubs
        .filter(_.IdentityID__c.equals(productSwitchSub.SF_Subscription__r.Buyer__r.IdentityID__c))

    EnhancedProductSwitchSub(
      identityId = productSwitchSub.SF_Subscription__r.Buyer__r.IdentityID__c,
      productSwitchSub = productSwitchSub,
      associatedActiveNonGiftSubs = associatedActiveNonGiftSubs,
    )
  }
}

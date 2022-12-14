package com.gu.soft_opt_in_consent_setter.models

case class EnhancedCancelledSub(
    identityId: String,
    cancelledSub: SFSubRecord,
    associatedActiveNonGiftSubs: Seq[SFAssociatedSubRecord],
)

object EnhancedCancelledSub {
  def apply(cancelledSub: SFSubRecord, associatedSubs: Seq[SFAssociatedSubRecord]): EnhancedCancelledSub = {
    val associatedActiveNonGiftSubs =
      associatedSubs
        .filter(_.IdentityID__c.equals(cancelledSub.Buyer__r.IdentityID__c))

    EnhancedCancelledSub(
      identityId = cancelledSub.Buyer__r.IdentityID__c,
      cancelledSub = cancelledSub,
      associatedActiveNonGiftSubs = associatedActiveNonGiftSubs,
    )
  }
}

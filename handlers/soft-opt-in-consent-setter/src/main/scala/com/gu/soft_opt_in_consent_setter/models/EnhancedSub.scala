package com.gu.soft_opt_in_consent_setter.models

case class EnhancedSub(identityId: String, productNames: Set[String])

object EnhancedSub {

  // the scheduled batch path (Salesforce-sourced)
  // TODO work out why doesn't it consider IAP subs at this point?
  def fromSF(sub: SFSubRecord, associatedSubs: Seq[SFAssociatedSubRecord]): EnhancedSub = {
    val productNames = associatedSubs
      .filter(_.IdentityID__c.equals(sub.Buyer__r.IdentityID__c))
      .map(_.Product__c)
      .toSet

    EnhancedSub(sub.Buyer__r.IdentityID__c, productNames)
  }

  // the SQS/IAP-driven path
  def fromSQS(
      identityId: String,
      activeSubs: Seq[SFAssociatedSubRecord],
      iapProductNames: Seq[String],
  ): EnhancedSub = {
    EnhancedSub(identityId, activeSubs.map(_.Product__c).toSet ++ iapProductNames)
  }
}

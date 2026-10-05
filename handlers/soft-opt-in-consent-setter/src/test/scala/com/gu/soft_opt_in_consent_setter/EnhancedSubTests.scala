package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.EnhancedSub
import com.gu.soft_opt_in_consent_setter.testData.SFSubscriptionTestData._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class EnhancedSubTests extends AnyFlatSpec with should.Matchers {

  // EnhancedSub.fromSF tests
  "EnhancedSub.fromSF" should "set the identityId correctly" in {
    EnhancedSub.fromSF(subRecord, Seq(), Set.empty).identityId shouldBe identityId
  }

  "EnhancedSub.fromSF" should "include the active products with no secondary access" in {
    EnhancedSub.fromSF(subRecord, associatedSubsWithOverlap, Set.empty).productsWithSecondaryAccess shouldBe Set(
      overlappingAssociatedSub.Product__c,
    )
  }

  "EnhancedSub.fromSF" should "not include products of a non-matching identity" in {
    EnhancedSub
      .fromSF(subRecord, associatedSubsWithoutOverlap, Set.empty)
      .productsWithSecondaryAccess shouldBe Set.empty
  }

  "EnhancedSub.fromSF" should "not count the subscription being processed as other secondary access" in {
    EnhancedSub
      .fromSF(subRecord, associatedSubsWithOverlap, Set(subRecord.Name))
      .productsWithSecondaryAccess shouldBe Set(overlappingAssociatedSub.Product__c)
  }

  "EnhancedSub.fromSF" should "detect another active secondary subscription" in {
    EnhancedSub
      .fromSF(subRecord, associatedSubsWithOverlap, Set(subRecord.Name, "A-S999999"))
      .productsWithSecondaryAccess shouldBe Set(overlappingAssociatedSub.Product__c, "Secondary User")
  }

  // EnhancedSub.fromSQS tests
  "EnhancedSub.fromSQS" should "set the identityId correctly" in {
    EnhancedSub.fromSQS(identityId, subRecord.Name, Seq.empty, Seq.empty, Set.empty).identityId shouldBe identityId
  }

  "EnhancedSub.fromSQS" should "combine Salesforce associated subs and IAP product names" in {
    EnhancedSub
      .fromSQS(identityId, subRecord.Name, associatedSubsWithOverlap, Seq("FeastInAppPurchase"), Set.empty)
      .productsWithSecondaryAccess shouldBe Set(overlappingAssociatedSub.Product__c, "FeastInAppPurchase")
  }

  "EnhancedSub.fromSQS" should "not count the subscription being processed as other secondary access" in {
    EnhancedSub
      .fromSQS(identityId, subRecord.Name, associatedSubsWithOverlap, Seq.empty, Set(subRecord.Name))
      .productsWithSecondaryAccess shouldBe Set(overlappingAssociatedSub.Product__c)
  }

  "EnhancedSub.fromSQS" should "detect another active secondary subscription" in {
    EnhancedSub
      .fromSQS(identityId, subRecord.Name, associatedSubsWithOverlap, Seq.empty, Set(subRecord.Name, "A-S999999"))
      .productsWithSecondaryAccess shouldBe Set(overlappingAssociatedSub.Product__c, "Secondary User")
  }
}

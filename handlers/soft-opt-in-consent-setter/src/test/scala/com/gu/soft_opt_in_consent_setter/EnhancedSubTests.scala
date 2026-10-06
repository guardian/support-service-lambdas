package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{ConsentsMapping, EnhancedSub, SFAssociatedSubRecord}
import com.gu.soft_opt_in_consent_setter.testData.SFSubscriptionTestData._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class EnhancedSubTests extends AnyFlatSpec with should.Matchers {

  // EnhancedSub.fromSF tests
  "EnhancedSub.fromSF" should "set the identityId correctly" in {
    EnhancedSub.fromSF(subRecord, Seq(), Set.empty).identityId shouldBe identityId
  }

  "EnhancedSub.fromSF" should "set the productsWithSecondaryAccess correctly when an associated sub exists for the same identity" in {
    EnhancedSub.fromSF(subRecord, associatedSubsWithOverlap, Set.empty).productsWithSecondaryAccess shouldBe Set(
      overlappingAssociatedSub.Product__c,
    )
  }

  "EnhancedSub.fromSF" should "set the productsWithSecondaryAccess correctly when no associated sub exists for the same identity" in {
    EnhancedSub.fromSF(subRecord, associatedSubsWithoutOverlap, Set.empty).productsWithSecondaryAccess shouldBe Set()
  }

  "EnhancedSub.fromSF" should "not add secondary access when the only active secondary subscription is the one being processed" in {
    EnhancedSub
      .fromSF(subRecord, Seq(), Set(subRecord.Name))
      .productsWithSecondaryAccess shouldBe Set()
  }

  "EnhancedSub.fromSF" should "add 'Secondary User' when there is active secondary access to another subscription" in {
    EnhancedSub
      .fromSF(subRecord, Seq(), Set(subRecord.Name, "A-S999999"))
      .productsWithSecondaryAccess shouldBe Set(ConsentsMapping.secondaryDigitalAccessProductName)
  }

  // EnhancedSub.fromSQS tests
  "EnhancedSub.fromSQS" should "set the identityId correctly" in {
    EnhancedSub.fromSQS(identityId, Seq(), Seq(), Set.empty, subId).identityId shouldBe identityId
  }

  "EnhancedSub.fromSQS" should "combine the active SF product names with the IAP product names" in {
    EnhancedSub
      .fromSQS(
        identityId,
        Seq(SFAssociatedSubRecord("Contributor", identityId)),
        Seq("InAppPurchase"),
        Set.empty,
        subId,
      )
      .productsWithSecondaryAccess shouldBe Set("Contributor", "InAppPurchase")
  }

  "EnhancedSub.fromSQS" should "return an empty set when there are no active SF or IAP products" in {
    EnhancedSub.fromSQS(identityId, Seq(), Seq(), Set.empty, subId).productsWithSecondaryAccess shouldBe Set()
  }

  "EnhancedSub.fromSQS" should "not add secondary access when the only active secondary subscription is the one being processed" in {
    EnhancedSub
      .fromSQS(identityId, Seq(), Seq(), Set(subId), subId)
      .productsWithSecondaryAccess shouldBe Set()
  }

  "EnhancedSub.fromSQS" should "add 'Secondary User' when there is active secondary access to another subscription" in {
    EnhancedSub
      .fromSQS(identityId, Seq(), Seq(), Set(subId, "A-S999999"), subId)
      .productsWithSecondaryAccess shouldBe Set(ConsentsMapping.secondaryDigitalAccessProductName)
  }
}

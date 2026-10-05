package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{EnhancedSub, SFAssociatedSubRecord}
import com.gu.soft_opt_in_consent_setter.testData.SFSubscriptionTestData._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class EnhancedSubTests extends AnyFlatSpec with should.Matchers {

  // EnhancedSub.fromSF tests
  "EnhancedSub.fromSF" should "set the identityId correctly" in {
    EnhancedSub.fromSF(subRecord, Seq()).identityId shouldBe identityId
  }

  "EnhancedSub.fromSF" should "set the productNames correctly when an associated sub exists for the same identity" in {
    EnhancedSub.fromSF(subRecord, associatedSubsWithOverlap).productNames shouldBe Set(
      overlappingAssociatedSub.Product__c,
    )
  }

  "EnhancedSub.fromSF" should "set the productNames correctly when no associated sub exists for the same identity" in {
    EnhancedSub.fromSF(subRecord, associatedSubsWithoutOverlap).productNames shouldBe Set()
  }

  // EnhancedSub.fromSQS tests
  "EnhancedSub.fromSQS" should "set the identityId correctly" in {
    EnhancedSub.fromSQS(identityId, Seq(), Seq()).identityId shouldBe identityId
  }

  "EnhancedSub.fromSQS" should "combine the active SF product names with the IAP product names" in {
    EnhancedSub
      .fromSQS(
        identityId,
        Seq(SFAssociatedSubRecord("Contributor", identityId)),
        Seq("InAppPurchase"),
      )
      .productNames shouldBe Set("Contributor", "InAppPurchase")
  }

  "EnhancedSub.fromSQS" should "return an empty set when there are no active SF or IAP products" in {
    EnhancedSub.fromSQS(identityId, Seq(), Seq()).productNames shouldBe Set()
  }
}

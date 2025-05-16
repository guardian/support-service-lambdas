package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.EnhancedSub
import com.gu.soft_opt_in_consent_setter.testData.SFSubscriptionTestData._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class EnhancedSubTests extends AnyFlatSpec with should.Matchers {

  // EnhancedSub.apply tests
  "EnhancedSub.apply" should "set the identityId correctly" in {
    EnhancedSub(subRecord, Seq()).identityId shouldBe identityId
  }

  "EnhancedSub.apply" should "set the cancelledSub correctly" in {
    EnhancedSub(subRecord, Seq()).sub shouldBe subRecord
  }

  "EnhancedSub.apply" should "set the associatedActiveNonGiftSubs correctly when one exists" in {
    EnhancedSub(subRecord, associatedSubsWithOverlap).associatedActiveNonGiftSubs shouldBe Seq(
      overlappingAssociatedSub,
    )
  }

  "EnhancedSub.apply" should "set the associatedActiveNonGiftSubs correctly when one does not exist" in {
    EnhancedSub(subRecord, associatedSubsWithoutOverlap).associatedActiveNonGiftSubs shouldBe Seq()
  }
}

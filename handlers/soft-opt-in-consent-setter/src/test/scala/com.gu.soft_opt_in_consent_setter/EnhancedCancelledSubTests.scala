package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{EnhancedCancelledSub}
import com.gu.soft_opt_in_consent_setter.testData.SFSubscriptionTestData._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class EnhancedCancelledSubTests extends AnyFlatSpec with should.Matchers {

  // EnhancedCancelledSub.apply tests
  "EnhancedCancelledSub.apply" should "set the identityId correctly" in {
    EnhancedCancelledSub(subRecord, Seq()).identityId shouldBe identityId
  }

  "EnhancedCancelledSub.apply" should "set the cancelledSub correctly" in {
    EnhancedCancelledSub(subRecord, Seq()).cancelledSub shouldBe subRecord
  }

  "EnhancedCancelledSub.apply" should "set the associatedActiveNonGiftSubs correctly when one exists" in {
    EnhancedCancelledSub(subRecord, associatedSubsWithOverlap).associatedActiveNonGiftSubs shouldBe Seq(
      overlappingAssociatedSub,
    )
  }

  "EnhancedCancelledSub.apply" should "set the associatedActiveNonGiftSubs correctly when one does not exist" in {
    EnhancedCancelledSub(subRecord, associatedSubsWithoutOverlap).associatedActiveNonGiftSubs shouldBe Seq()
  }
}

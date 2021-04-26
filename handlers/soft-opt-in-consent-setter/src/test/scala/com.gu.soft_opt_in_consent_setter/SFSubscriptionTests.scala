package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.SFSubscription._
import com.gu.soft_opt_in_consent_setter.models.SoftOptInError
import com.gu.soft_opt_in_consent_setter.testData.SFSubscriptionTestData._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class SFSubscriptionTests extends AnyFlatSpec with should.Matchers {

  // UpdateRecord.successfulUpdate tests
  "UpdateRecord.successfulUpdate" should "set the id field correctly" in {
    UpdateRecord.successfulUpdate(subRecord, softOptInStage).Id shouldBe subId
  }

  "UpdateRecord.successfulUpdate" should "update the stage field correctly" in {
    UpdateRecord.successfulUpdate(subRecord, softOptInStage).Soft_Opt_in_Last_Stage_Processed__c shouldBe Some(softOptInStage)
  }

  "UpdateRecord.successfulUpdate" should "set number of attempts to 0" in {
    UpdateRecord.successfulUpdate(subRecord, softOptInStage).Soft_Opt_in_Number_of_Attempts__c shouldBe 0
  }

  // UpdateRecord.failedUpdate tests
  "UpdateRecord.failedUpdate" should "set the id field correctly" in {
    UpdateRecord.failedUpdate(subRecord).Id shouldBe subId
  }

  "UpdateRecord.failedUpdate" should "not alter the last stage processed" in {
    UpdateRecord.failedUpdate(subRecord).Soft_Opt_in_Last_Stage_Processed__c shouldBe Some(lastProcessedStage)
  }

  "UpdateRecord.failedUpdate" should "increment the number of attempts by 1" in {
    UpdateRecord.failedUpdate(subRecord).Soft_Opt_in_Number_of_Attempts__c shouldBe numberOfAttempts + 1
  }

  // UpdateRecord.apply tests
  "UpdateRecord.apply" should "return a correctly formed UpdateRecord when a successful updateResult is passed in" in {
    val result = UpdateRecord(subRecord, softOptInStage, Right(()))

    result.Id shouldBe subId
    result.Soft_Opt_in_Last_Stage_Processed__c shouldBe Some(softOptInStage)
    result.Soft_Opt_in_Number_of_Attempts__c shouldBe 0
  }

  "UpdateRecord.apply" should "return a correctly formed UpdateRecord when a failed updateResult is passed in" in {
    val result = UpdateRecord(subRecord, softOptInStage, Left(SoftOptInError("", "")))

    result.Id shouldBe subId
    result.Soft_Opt_in_Last_Stage_Processed__c shouldBe Some(lastProcessedStage)
    result.Soft_Opt_in_Number_of_Attempts__c shouldBe numberOfAttempts + 1
  }

  // EnhancedCancelledSub.apply tests
  "EnhancedCancelledSub.apply" should "set the identityId correctly" in {
    EnhancedCancelledSub(subRecord, Seq()).identityId shouldBe identityId
  }

  "EnhancedCancelledSub.apply" should "set the cancelledSub correctly" in {
    EnhancedCancelledSub(subRecord, Seq()).cancelledSub shouldBe subRecord
  }

  "EnhancedCancelledSub.apply" should "set the associatedActiveNonGiftSubs correctly when one exists" in {
    EnhancedCancelledSub(subRecord, associatedSubsWithOverlap).associatedActiveNonGiftSubs shouldBe Seq(overlappingAssociatedSub)
  }

  "EnhancedCancelledSub.apply" should "set the associatedActiveNonGiftSubs correctly when one does not exist" in {
    EnhancedCancelledSub(subRecord, associatedSubsWithoutOverlap).associatedActiveNonGiftSubs shouldBe Seq()
  }

}

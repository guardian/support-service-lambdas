package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{SFSubRecordUpdate, SoftOptInError}
import com.gu.soft_opt_in_consent_setter.testData.SFSubscriptionTestData._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class SFSubRecordUpdateTests extends AnyFlatSpec with should.Matchers {

  // UpdateRecord.successfulUpdate tests
  "SFSubRecordUpdate.successfulUpdate" should "set the id field correctly" in {
    SFSubRecordUpdate.successfulUpdate(subRecord.Id, softOptInStage).Id shouldBe subId
  }

  "SFSubRecordUpdate.successfulUpdate" should "update the stage field correctly" in {
    SFSubRecordUpdate.successfulUpdate(subRecord.Id, softOptInStage).Soft_Opt_in_Last_Stage_Processed__c shouldBe Some(
      softOptInStage,
    )
  }

  "SFSubRecordUpdate.successfulUpdate" should "set number of attempts to 0" in {
    SFSubRecordUpdate.successfulUpdate(subRecord.Id, softOptInStage).Soft_Opt_in_Number_of_Attempts__c shouldBe 0
  }

  // UpdateRecord.failedUpdate tests
  "SFSubRecordUpdate.failedUpdate" should "set the id field correctly" in {
    SFSubRecordUpdate
      .failedUpdate(
        subRecord.Id,
        subRecord.Soft_Opt_in_Number_of_Attempts__c,
        subRecord.Soft_Opt_in_Last_Stage_Processed__c,
      )
      .Id shouldBe subId
  }

  "SFSubRecordUpdate.failedUpdate" should "not alter the last stage processed" in {
    SFSubRecordUpdate
      .failedUpdate(
        subRecord.Id,
        subRecord.Soft_Opt_in_Number_of_Attempts__c,
        subRecord.Soft_Opt_in_Last_Stage_Processed__c,
      )
      .Soft_Opt_in_Last_Stage_Processed__c shouldBe Some(lastProcessedStage)
  }

  "SFSubRecordUpdate.failedUpdate" should "increment the number of attempts by 1" in {
    SFSubRecordUpdate
      .failedUpdate(
        subRecord.Id,
        subRecord.Soft_Opt_in_Number_of_Attempts__c,
        subRecord.Soft_Opt_in_Last_Stage_Processed__c,
      )
      .Soft_Opt_in_Number_of_Attempts__c shouldBe numberOfAttempts + 1
  }

  // SFSubRecordUpdate.apply tests
  "SFSubRecordUpdate.apply" should "return a correctly formed UpdateRecord when a successful updateResult is passed in" in {
    val result = SFSubRecordUpdate(
      subRecord.Id,
      softOptInStage,
      subRecord.Soft_Opt_in_Number_of_Attempts__c,
      subRecord.Soft_Opt_in_Last_Stage_Processed__c,
      Right(()),
    )

    result.Id shouldBe subId
    result.Soft_Opt_in_Last_Stage_Processed__c shouldBe Some(softOptInStage)
    result.Soft_Opt_in_Number_of_Attempts__c shouldBe 0
  }

  "UpdateRecord.apply" should "return a correctly formed UpdateRecord when a failed updateResult is passed in" in {
    val result = SFSubRecordUpdate(
      subRecord.Id,
      softOptInStage,
      subRecord.Soft_Opt_in_Number_of_Attempts__c,
      subRecord.Soft_Opt_in_Last_Stage_Processed__c,
      Left(SoftOptInError("", "")),
    )

    result.Id shouldBe subId
    result.Soft_Opt_in_Last_Stage_Processed__c shouldBe Some(lastProcessedStage)
    result.Soft_Opt_in_Number_of_Attempts__c shouldBe numberOfAttempts + 1
  }

}

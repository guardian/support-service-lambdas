package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{AssociatedSFSubscription, SFSubscription, SoftOptInError}
import com.gu.soft_opt_in_consent_setter.testData.SfSubscription._
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class MainTests extends AnyFlatSpec with should.Matchers with EitherValues {

  "failedUpdateToRecordBody" should "set sub Id" in {
    Main.failedUpdateToRecordBody(fakeSfSub).Id shouldBe fakeSfSub.Id
  }

  "failedUpdateToRecordBody" should "increment Soft_Opt_in_Number_of_Attempts__c by 1" in {
    Main.failedUpdateToRecordBody(fakeSfSub).Soft_Opt_in_Number_of_Attempts__c shouldBe 2
  }

  "failedUpdateToRecordBody" should "treat a null value for Soft_Opt_in_Number_of_Attempts__c as a 0 and increment to 1" in {
    Main.failedUpdateToRecordBody(fakeSfSub_withNullValue).Soft_Opt_in_Number_of_Attempts__c shouldBe 1
  }

  "failedUpdateToRecordBody" should "not change the value of Soft_Opt_in_Last_Stage_Processed__c" in {
    Main.failedUpdateToRecordBody(fakeSfSub).Soft_Opt_in_Last_Stage_Processed__c shouldBe fakeSfSub.Soft_Opt_in_Last_Stage_Processed__c
  }

  "successfulUpdateToRecordBody" should "set sub Id" in {
    Main.successfulUpdateToRecordBody(fakeSfSub, "Acquisition").Id shouldBe fakeSfSub.Id
  }

  "successfulUpdateToRecordBody" should "set Soft_Opt_in_Last_Stage_Processed__c to Acquisition when acquisition processed" in {
    Main.successfulUpdateToRecordBody(fakeSfSub, "Acquisition").Soft_Opt_in_Last_Stage_Processed__c shouldBe Some("Acquisition")
  }

  "successfulUpdateToRecordBody" should "set Soft_Opt_in_Number_of_Attempts__c to 0" in {
    Main.successfulUpdateToRecordBody(fakeSfSub, "Acquisition").Soft_Opt_in_Number_of_Attempts__c shouldBe 0
  }

  "buildSfUpdateRequest" should "return a SFSubscription.UpdateRecord with values representing a failed update to Identity when provided with a SoftOptInError" in {
    val result = Main.buildSfUpdateRequest(fakeSfSub, "Acquisition", Left(SoftOptInError("IdentityConnector", "Identity request failed: java.lang.Throwable")))

    result.Soft_Opt_in_Last_Stage_Processed__c shouldBe Some("")
    result.Soft_Opt_in_Number_of_Attempts__c shouldBe 2
  }

  "buildSfUpdateRequest" should "return a SFSubscription.UpdateRecord with values representing a successful update to Identity when provided with a Unit" in {
    val result = Main.buildSfUpdateRequest(fakeSfSub, "Acquisition", Right(()))

    result.Soft_Opt_in_Last_Stage_Processed__c shouldBe Some("Acquisition")
    result.Soft_Opt_in_Number_of_Attempts__c shouldBe 0
  }

  "getEnhancedCancelledSubs" should "return a Seq[SFSubscription.EnhancedCancelledSub] containing a Seq[AssociatedSFSubscription.Record] matched on Identity Id" in {
    val result = Main.getEnhancedCancelledSubs(Seq[SFSubscription.Record](fakeSfSub_withCancelledStatus), Seq[AssociatedSFSubscription.Record](fakeAssociatedSfSub))

    result.size shouldBe 1

    result.head.identityId shouldBe fakeBuyer.IdentityID__c
    result.head.cancelledSub shouldBe fakeSfSub_withCancelledStatus
    result.head.associatedActiveNonGiftSubs.head shouldBe fakeAssociatedSfSub
    result.head.associatedActiveNonGiftSubs.head.IdentityID__c shouldBe fakeBuyer.IdentityID__c
  }

}

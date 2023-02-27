package com.gu.soft_opt_in_consent_setter.testData

import com.gu.soft_opt_in_consent_setter.models.{
  SFAssociatedSubRecord,
  SFBuyer,
  SFSubRecord,
  SubscriptionRatePlanUpdateRecord,
  Subscription_Rate_Plan_Updates__r,
}

object SFSubscriptionTestData {
  val softOptInStage = "New Stage"

  val subId = "001RM000003oCprYAE"
  val subId2 = "a2F5I00000DgmrFPRE"
  val identityId = "12345678"
  val buyer = SFBuyer(identityId)
  val lastProcessedStage = "Last Stage"
  val numberOfAttempts = 1

  val subRecord = SFSubRecord(
    subId,
    "A-S000000",
    "membership",
    "Active",
    "Ready for Acquisition",
    buyer,
    None,
    Some(lastProcessedStage),
    Some(numberOfAttempts),
  )

  val subRecord2 = SFSubRecord(
    subId2,
    "A-S01799823",
    "Supporter Plus",
    "Active",
    "Acquisition processed",
    buyer,
    Some(
      Subscription_Rate_Plan_Updates__r(
        1,
        true,
        List(SubscriptionRatePlanUpdateRecord("a0t5I0000017Je6QBD", "Contribution")),
      ),
    ),
    Some("Acquisition"),
    Some(0),
  )

  val subRecord3 = SFSubRecord(
    "a2F9E000007SHrqUAG",
    "A-S00339155",
    "Supporter Plus",
    "Active",
    "Ready to process switch",
    SFBuyer("200000671"),
    None,
    Some("Acquisition"),
    Some(0),
  )

  val overlappingAssociatedSub2 = SFAssociatedSubRecord("contribution", identityId)
  val nonOverlappingAssociatedSub2 = SFAssociatedSubRecord("contribution", s"identityId${0}")

  val associatedSubsWithOverlap2: Seq[SFAssociatedSubRecord] = Seq(
    overlappingAssociatedSub,
    nonOverlappingAssociatedSub,
  )

  val associatedSubsWithoutOverlap2: Seq[SFAssociatedSubRecord] = Seq(nonOverlappingAssociatedSub)

  val Soft_Opt_in_Processed__c = true

  val lastProcessedStage2 = "Acquisition"
  val numberOfAttempts2 = 3

  val overlappingAssociatedSub = SFAssociatedSubRecord("contribution", identityId)
  val nonOverlappingAssociatedSub = SFAssociatedSubRecord("contribution", s"identityId${0}")

  val associatedSubsWithOverlap: Seq[SFAssociatedSubRecord] = Seq(
    overlappingAssociatedSub,
    nonOverlappingAssociatedSub,
  )

  val associatedSubsWithoutOverlap: Seq[SFAssociatedSubRecord] = Seq(nonOverlappingAssociatedSub)
}

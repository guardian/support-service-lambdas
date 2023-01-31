package com.gu.soft_opt_in_consent_setter.testData

import com.gu.soft_opt_in_consent_setter.models.{SFBuyer, SFAssociatedSubRecord, SFSubRecord}

object TestData {
  val softOptInStage = "New Stage"

  val subId = "001RM000003oCprYAE"
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
    Some(lastProcessedStage),
    Some(numberOfAttempts),
  )

  val subRecord2 = SFSubRecord(
    subId,
    "A-S123546",
    "supporter plus",
    "Active",
    "Acquisition processed",
    buyer,
    Some(lastProcessedStage),
    Some(numberOfAttempts),
  )

  val overlappingAssociatedSub2 = SFAssociatedSubRecord("contribution", identityId)
  val nonOverlappingAssociatedSub2 = SFAssociatedSubRecord("contribution", s"identityId${0}")

  val associatedSubsWithOverlap2: Seq[SFAssociatedSubRecord] = Seq(
    overlappingAssociatedSub,
    nonOverlappingAssociatedSub,
  )

  val associatedSubsWithoutOverlap2: Seq[SFAssociatedSubRecord] = Seq(nonOverlappingAssociatedSub)

  val Soft_Opt_in_Processed__c = true

  val subId2 = "001RM000003oCprMAN"
  val identityId2 = "12345"
  val buyer2 = SFBuyer(identityId)
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

package com.gu.soft_opt_in_consent_setter.testData

import com.gu.soft_opt_in_consent_setter.models.{SFBuyer, SFAssociatedSubRecord, SFSubRecord}

object SFSubscriptionTestData {

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

  val overlappingAssociatedSub = SFAssociatedSubRecord("contribution", identityId)
  val nonOverlappingAssociatedSub = SFAssociatedSubRecord("contribution", s"identityId${0}")

  val associatedSubsWithOverlap: Seq[SFAssociatedSubRecord] = Seq(
    overlappingAssociatedSub,
    nonOverlappingAssociatedSub,
  )

  val associatedSubsWithoutOverlap: Seq[SFAssociatedSubRecord] = Seq(nonOverlappingAssociatedSub)

}

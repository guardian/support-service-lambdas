package com.gu.soft_opt_in_consent_setter.testData

import com.gu.soft_opt_in_consent_setter.models.{SFSubscription, AssociatedSFSubscription}

object SFSubscriptionTestData {

  val softOptInStage = "New Stage"

  val subId = "001RM000003oCprYAE"
  val identityId = "12345678"
  val buyer = SFSubscription.Buyer__r(identityId)
  val lastProcessedStage = "Last Stage"
  val numberOfAttempts = 1

  val subRecord: SFSubscription.Record = SFSubscription.Record(
    subId,
    "A-S000000",
    "membership",
    "Active",
    "Ready for Acquisition",
    buyer,
    Some(lastProcessedStage),
    Some(numberOfAttempts)
  )

  val overlappingAssociatedSub = AssociatedSFSubscription.Record("contribution", identityId)
  val nonOverlappingAssociatedSub = AssociatedSFSubscription.Record("contribution", s"identityId${0}")

  val associatedSubsWithOverlap: Seq[AssociatedSFSubscription.Record] = Seq(
    overlappingAssociatedSub,
    nonOverlappingAssociatedSub,
  )

  val associatedSubsWithoutOverlap: Seq[AssociatedSFSubscription.Record] = Seq(nonOverlappingAssociatedSub)



}

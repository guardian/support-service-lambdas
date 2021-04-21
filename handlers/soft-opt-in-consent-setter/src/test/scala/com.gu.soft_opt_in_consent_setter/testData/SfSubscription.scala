package com.gu.soft_opt_in_consent_setter.testData

import com.gu.soft_opt_in_consent_setter.models.{SFSubscription, AssociatedSFSubscription}

object SfSubscription {

  val fakeBuyer = SFSubscription.Buyer__r("12345678")

  val fakeSfSub: SFSubscription.Record = SFSubscription.Record(
    "001RM000003oCprYAE",
    "A-S000000",
    "membership",
    "Active",
    "Ready for Acquisition",
    fakeBuyer,
    Some(""),
    Some(1)
  )
  val fakeAssociatedSfSub: AssociatedSFSubscription.Record = AssociatedSFSubscription.Record(
    "contribution",
    fakeBuyer.IdentityID__c
  )
  val fakeSfSub_withInvalidProduct: SFSubscription.Record =
    fakeSfSub.copy(Product__c = "nonexistentProduct")

  val fakeSfSub_withNullValue: SFSubscription.Record =
    fakeSfSub.copy(Soft_Opt_in_Number_of_Attempts__c = None)

  val fakeSfSub_withCancelledStatus: SFSubscription.Record =
    fakeSfSub.copy(SF_Status__c = "Cancelled")

}

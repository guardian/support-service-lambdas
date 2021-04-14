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

  val fakeSfSubs = SFSubscription.Response(0, true, Seq())
  val fakeSfSubsResponse =
    s"""{
       | "totalSize": 0,
       | "done": true,
       | "records": []
       |}""".stripMargin

  val fakeAssociatedSfSubs = AssociatedSFSubscription.Response(0, true, Seq())
  val fakeAssociatedSfSubsResponse =
    s"""{
       | "totalSize": 0,
       | "done": true,
       | "records": []
       |}""".stripMargin

  val fakeSfSubsSuccessfulUpdateResponse =
    s"""[{
       | "id" : "001RM000003oCprYAE",
       | "success" : true,
       | "errors" : [ ]
   }]""".stripMargin

  val fakeSfSubsFailedUpdateResponse =
    s"""[{
       | "success" : false,
       | "errors" : [
       |  {
       |    "statusCode" : "MALFORMED_ID",
       |    "message" : "Contact ID: id value of incorrect type: 001xx000003DGb2999",
       |     "fields" : [
       |        "Id"
       |      ]
       |  }]
   }]""".stripMargin
}

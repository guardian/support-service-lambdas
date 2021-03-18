package com.gu.soft_opt_in_consent_setter

object SFSubscription {

  case class Response(
    totalSize: Int,
    done: Boolean,
    records: Seq[Record]
  )

  case class Record(
    Id: String,
    Name: String,
    Product__c: String,
    SF_Status__c: String,
    Soft_Opt_in_Status__c: String,
    Buyer__r: Buyer__r,
    Soft_Opt_in_Last_Stage_Processed__c: Option[String] = None,
    Soft_Opt_in_Number_of_Attempts__c: Int, //TODO we need to handle potential nulls on this field
  )

  case class Buyer__r(IdentityID__c: String)

  case class UpdateRecord(
    Id: String,
    Soft_Opt_in_Last_Stage_Processed__c: Option[String] = None,
    Soft_Opt_in_Number_of_Attempts__c: Int,
    attributes: Attributes = Attributes(
      `type` = "SF_Subscription__c"
    )
  )

  case class Attributes(`type`: String)

  case class UpdateRecordRequest(records: Seq[SFSubscription.UpdateRecord]) {
    def allOrNone = false
  }

  case class EnhancedCancelledSub(identityId: String, cancelledSub: SFSubscription.Record, associatedActiveNonGiftSubs: Seq[AssociatedSFSubscription.Record])

}

package com.gu.soft_opt_in_consent_setter.models

case class SFSubRecord(
    Id: String,
    Name: String,
    Product__c: String,
    SF_Status__c: String,
    Soft_Opt_in_Status__c: String,
    Buyer__r: SFBuyer,
    Soft_Opt_in_Last_Stage_Processed__c: Option[String] = None,
    Soft_Opt_in_Number_of_Attempts__c: Option[Int] = Some(0),
)

case class SubscriptionRatePlanUpdateRecord(
    Id: String,
    Name: String,
    Previous_Product_Name__c: String,
    SF_Subscription__r: SFSubscription__r,
    Soft_Opt_In_Processed__c: Boolean,
    Soft_Opt_In_Number_of_Attempts__c: Int,
)

case class SFSubscription__r(
    Product__c: String,
    SF_Status__c: String,
    Buyer__r: SFBuyer,
)

case class SFBuyer(IdentityID__c: String)

case class SFSubRecordResponse(totalSize: Int, done: Boolean, records: Seq[SFSubRecord])
case class SubscriptionRatePlanUpdateRecordResponse(
    totalSize: Int,
    done: Boolean,
    records: Seq[SubscriptionRatePlanUpdateRecord],
)

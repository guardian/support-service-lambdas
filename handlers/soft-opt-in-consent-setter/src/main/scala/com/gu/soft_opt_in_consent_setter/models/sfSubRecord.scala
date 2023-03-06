package com.gu.soft_opt_in_consent_setter.models

case class SFSubRecord(
    Id: String,
    Name: String,
    Product__c: String,
    SF_Status__c: String,
    Soft_Opt_in_Status__c: String,
    Buyer__r: SFBuyer,
    Subscription_Rate_Plan_Updates__r: Option[Subscription_Rate_Plan_Updates__r],
    Soft_Opt_in_Last_Stage_Processed__c: Option[String] = None,
    Soft_Opt_in_Number_of_Attempts__c: Option[Int] = Some(0),
)

case class SubscriptionRatePlanUpdateRecord(
    Id: String,
    Previous_Product_Name__c: String,
)

case class SFSubscription__r(
    Product__c: String,
    SF_Status__c: String,
    Buyer__r: SFBuyer,
)

case class Subscription_Rate_Plan_Updates__r(
    totalSize: Int,
    done: Boolean,
    records: Seq[SubscriptionRatePlanUpdateRecord],
)

case class SFBuyer(IdentityID__c: String)

case class SFSubRecordResponse(totalSize: Int, done: Boolean, records: Seq[SFSubRecord])

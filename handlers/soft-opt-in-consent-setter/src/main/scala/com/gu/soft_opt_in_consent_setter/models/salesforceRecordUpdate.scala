package com.gu.soft_opt_in_consent_setter.models

case class SFSubRecordUpdate(
    Id: String,
    Soft_Opt_in_Last_Stage_Processed__c: Option[String] = None,
    Soft_Opt_in_Number_of_Attempts__c: Int,
    attributes: Attributes = Attributes(`type` = "SF_Subscription__c"),
)

case class Attributes(`type`: String)

case class SFSubRecordUpdateRequest(records: Seq[SFSubRecordUpdate]) {
  def allOrNone = false
}

object SFSubRecordUpdate {

  def apply(
      subId: String,
      softOptInStage: String,
      Soft_Opt_in_Number_of_Attempts__c: Option[Int],
      Soft_Opt_in_Last_Stage_Processed__c: Option[String],
      updateResult: Either[SoftOptInError, Unit],
  ): SFSubRecordUpdate = {
    updateResult match {
      case Right(_) => successfulUpdate(subId, softOptInStage)
      case Left(_) => failedUpdate(subId, Soft_Opt_in_Number_of_Attempts__c, Soft_Opt_in_Last_Stage_Processed__c)
    }
  }

  def successfulUpdate(subId: String, softOptInStage: String): SFSubRecordUpdate = {
    SFSubRecordUpdate(
      Id = subId,
      Soft_Opt_in_Number_of_Attempts__c = 0,
      Soft_Opt_in_Last_Stage_Processed__c = Some(softOptInStage),
    )
  }

  def failedUpdate(
      subId: String,
      Soft_Opt_in_Number_of_Attempts__c: Option[Int],
      Soft_Opt_in_Last_Stage_Processed__c: Option[String],
  ): SFSubRecordUpdate = {
    SFSubRecordUpdate(
      Id = subId,
      Soft_Opt_in_Number_of_Attempts__c = Soft_Opt_in_Number_of_Attempts__c.getOrElse(0) + 1,
      Soft_Opt_in_Last_Stage_Processed__c = Soft_Opt_in_Last_Stage_Processed__c,
    )
  }

}

case class UpdateSubscriptionRatePlanUpdateRecord(
    Id: String,
    Soft_Opt_In_Number_of_Attempts__c: Int,
    Soft_Opt_in_Processed__c: Boolean,
    attributes: Attributes = Attributes(`type` = "Subscription_Rate_Plan_Update__c"),
)

case class UpdateSubscriptionRatePlanUpdateRecordRequest(records: Seq[UpdateSubscriptionRatePlanUpdateRecord]) {
  def allOrNone = false
}
object UpdateSubscriptionRatePlanUpdateRecord {

  def apply(
      subId: String,
      Soft_Opt_In_Number_of_Attempts__c: Int,
      updateResult: Either[SoftOptInError, Unit],
  ): UpdateSubscriptionRatePlanUpdateRecord = {
    updateResult match {
      case Right(_) => successfulUpdate(subId)
      case Left(_) => failedUpdate(subId, Soft_Opt_In_Number_of_Attempts__c)
    }
  }

  def successfulUpdate(subId: String): UpdateSubscriptionRatePlanUpdateRecord = {
    UpdateSubscriptionRatePlanUpdateRecord(
      Id = subId,
      Soft_Opt_In_Number_of_Attempts__c = 0,
      Soft_Opt_in_Processed__c = true,
    )
  }

  def failedUpdate(
      subId: String,
      Soft_Opt_in_Number_of_Attempts__c: Int,
  ): UpdateSubscriptionRatePlanUpdateRecord = {
    UpdateSubscriptionRatePlanUpdateRecord(
      Id = subId,
      Soft_Opt_In_Number_of_Attempts__c = Soft_Opt_in_Number_of_Attempts__c + 1,
      Soft_Opt_in_Processed__c = false,
    )
  }

}

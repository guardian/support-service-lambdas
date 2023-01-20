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

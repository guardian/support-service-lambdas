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

  def apply(sub: SFSubRecord, softOptInStage: String, updateResult: Either[SoftOptInError, Unit]): SFSubRecordUpdate = {
    updateResult match {
      case Right(_) => successfulUpdate(sub, softOptInStage)
      case Left(_) => failedUpdate(sub)
    }
  }

  def successfulUpdate(sub: SFSubRecord, softOptInStage: String): SFSubRecordUpdate = {
    SFSubRecordUpdate(
      Id = sub.Id,
      Soft_Opt_in_Number_of_Attempts__c = 0,
      Soft_Opt_in_Last_Stage_Processed__c = Some(softOptInStage),
    )
  }

  def failedUpdate(sub: SFSubRecord): SFSubRecordUpdate = {
    SFSubRecordUpdate(
      Id = sub.Id,
      Soft_Opt_in_Number_of_Attempts__c = sub.Soft_Opt_in_Number_of_Attempts__c.getOrElse(0) + 1,
      Soft_Opt_in_Last_Stage_Processed__c = sub.Soft_Opt_in_Last_Stage_Processed__c,
    )
  }

}

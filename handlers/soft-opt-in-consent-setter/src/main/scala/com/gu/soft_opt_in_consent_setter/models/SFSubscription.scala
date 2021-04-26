package com.gu.soft_opt_in_consent_setter.models

import com.typesafe.scalalogging.LazyLogging

object SFSubscription extends LazyLogging {

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
    Soft_Opt_in_Number_of_Attempts__c: Option[Int] = Some(0),
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

  object UpdateRecord {
    def apply(sub: SFSubscription.Record, softOptInStage: String, updateResult: Either[SoftOptInError, Unit]) = {
      updateResult match {
        case Right(_) => successfulUpdate(sub, softOptInStage)
        case Left(error) =>
          logger.warn(s"${error.errorType}: ${error.errorDetails}")
          failedUpdate(sub)
      }
    }

    def successfulUpdate(sub: SFSubscription.Record, softOptInStage: String): SFSubscription.UpdateRecord = {
      UpdateRecord(
        Id = sub.Id,
        Soft_Opt_in_Number_of_Attempts__c = 0,
        Soft_Opt_in_Last_Stage_Processed__c = Some(softOptInStage)
      )
    }

    def failedUpdate(sub: SFSubscription.Record): SFSubscription.UpdateRecord = {
      UpdateRecord(
        Id = sub.Id,
        Soft_Opt_in_Number_of_Attempts__c = sub.Soft_Opt_in_Number_of_Attempts__c.getOrElse(0) + 1,
        Soft_Opt_in_Last_Stage_Processed__c = sub.Soft_Opt_in_Last_Stage_Processed__c
      )
    }

  }

  case class Attributes(`type`: String)

  case class UpdateRecordRequest(records: Seq[SFSubscription.UpdateRecord]) {
    def allOrNone = false
  }

  case class EnhancedCancelledSub(identityId: String, cancelledSub: SFSubscription.Record, associatedActiveNonGiftSubs: Seq[AssociatedSFSubscription.Record])

  object EnhancedCancelledSub {
    def apply(cancelledSub: SFSubscription.Record, associatedSubs: Seq[AssociatedSFSubscription.Record]): EnhancedCancelledSub = {
      val associatedActiveNonGiftSubs =
        associatedSubs
          .filter(_.IdentityID__c.equals(cancelledSub.Buyer__r.IdentityID__c))

      EnhancedCancelledSub(
        identityId = cancelledSub.Buyer__r.IdentityID__c,
        cancelledSub = cancelledSub,
        associatedActiveNonGiftSubs = associatedActiveNonGiftSubs
      )
    }
  }

}

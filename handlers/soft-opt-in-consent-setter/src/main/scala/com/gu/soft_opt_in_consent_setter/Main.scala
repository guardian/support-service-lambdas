package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models._
import io.circe.generic.auto._
import io.circe.syntax.EncoderOps

// TODO Move all Comnfig code to its own file with class + companion object
// TODO Move all SF code to it own file with class
// TODO: Read Identity config from env variables
// TODO: Do functional testing
// TODO: Introduce error handling
// TODO: Add unit testing

object Main extends App {

  for {
    config <- SoftOptInConfig.get
    sfAuthDetails <- SalesforceConnector.auth(config.sfConfig)
    sfConnector = new SalesforceConnector(sfAuthDetails)
    allSubsToProcessFromSf <- sfConnector.getSfSubs()
  } yield {

    val sfRecords = allSubsToProcessFromSf.records
    println("sfRecords:" + sfRecords)

    val identityConnector = new IdentityConnector(config.identityConfig)

    val acqSubUpdatesToWriteBackToSf = processAcqSubs(
      identityConnector,
      sfRecords.filter(_.Soft_Opt_in_Status__c.equals("Ready to process acquisition"))
    )
    sfConnector.updateSubsInSf(SFSubscription.UpdateRecordRequest(acqSubUpdatesToWriteBackToSf).asJson.spaces2)

    val cancSubUpdatesToWriteBackToSf = processCancSubs(
      identityConnector,
      sfConnector,
      sfRecords.filter(_.Soft_Opt_in_Status__c.equals("Ready to process cancellation"))
    )

    sfConnector.updateSubsInSf(SFSubscription.UpdateRecordRequest(cancSubUpdatesToWriteBackToSf).asJson.spaces2)
  }

  def processAcqSubs(identityConnector: IdentityConnector, acqSubs: Seq[SFSubscription.Record]): Seq[SFSubscription.UpdateRecord] = {
    acqSubs.map(sub => {
      buildSfResponse(sub, "Acquisition",
        for {
          consents <- ConsentsCalculator.getAcqConsents(sub.Product__c)
          consentsBody = ConsentsCalculator.buildConsentsBody(consents, state = true)
          _ <- identityConnector.sendConsentsReq(sub.Buyer__r.IdentityID__c, consentsBody)
        } yield ()
      )
    })
  }

  def processCancSubs(identityConnector: IdentityConnector, sfConnector: SalesforceConnector, cancSubs: Seq[SFSubscription.Record]): Seq[SFSubscription.UpdateRecord] = {
    sfConnector.getActiveSubs(cancSubs.map(sub => sub.Buyer__r.IdentityID__c)) match {
      case Right(activeSubs) =>
        getEnhancedCancSubs(cancSubs, activeSubs.records)
          .map(sub => {
            buildSfResponse(sub.cancelledSub, "Cancellation",
              for {
                consents <- ConsentsCalculator.getCancConsents(sub.cancelledSub.Product__c, sub.associatedActiveNonGiftSubs.map(_.Product__c).toSet)
                _ <- sendCancConsentsIfPresent(identityConnector, sub.identityId, consents)
              } yield ()
            )
          })
      case Left(_) =>
        // TODO: Log Error
        cancSubs.map(failureSFResponse)
    }
  }

  def sendCancConsentsIfPresent(identityConnector: IdentityConnector, identityId: String, consents: Set[String]): Either[SoftOptInError, Unit] = {
    if (consents.isEmpty) {
      val consentsBody = ConsentsCalculator.buildConsentsBody(consents, state = false)
      identityConnector.sendConsentsReq(identityId, consentsBody)
    } else {
      Right(())
    }
  }

  def buildSfResponse(sub: SFSubscription.Record, stage: String, result: Either[SoftOptInError, Unit]): SFSubscription.UpdateRecord = {
    result match {
      case Right(_) => successfulSFResponse(sub, stage)
      case Left(failure) =>
        // TODO: Log error
        println(failure)
        failureSFResponse(sub)
    }
  }

  def successfulSFResponse(sub: SFSubscription.Record, softOptInStage: String): SFSubscription.UpdateRecord = {
    SFSubscription.UpdateRecord(
      Id = sub.Id,
      Soft_Opt_in_Number_of_Attempts__c = 0,
      Soft_Opt_in_Last_Stage_Processed__c = Some(softOptInStage)
    )
  }

  def failureSFResponse(sub: SFSubscription.Record): SFSubscription.UpdateRecord = {
    SFSubscription.UpdateRecord(
      Id = sub.Id,
      Soft_Opt_in_Number_of_Attempts__c = sub.Soft_Opt_in_Number_of_Attempts__c + 1,
      Soft_Opt_in_Last_Stage_Processed__c = sub.Soft_Opt_in_Last_Stage_Processed__c
    )
  }

  def getEnhancedCancSubs(cancSubs: Seq[SFSubscription.Record], associatedSubs: Seq[AssociatedSFSubscription.Record]): Seq[SFSubscription.EnhancedCancelledSub] = {
    cancSubs.map(a => {
      val associatedActiveNonGiftSubs = associatedSubs.filter(_.IdentityID__c.equals(a.Buyer__r.IdentityID__c))

      SFSubscription.EnhancedCancelledSub(
        identityId = a.Buyer__r.IdentityID__c,
        cancelledSub = a,
        associatedActiveNonGiftSubs = associatedActiveNonGiftSubs
      )
    })
  }

}

package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models._
// TODO: introduce notifications when number of attempts is incremented to 5
// TODO: Do functional testing
// TODO: Introduce error handling
// TODO: Add unit testing
import io.circe.generic.auto._
import io.circe.syntax.EncoderOps
object Main extends App {

  for {
    config <- SoftOptInConfig.get
    sfAuthDetails <- SalesforceConnector.auth(config.sfConfig)
    sfConnector = new SalesforceConnector(sfAuthDetails)
    allSubsToProcessFromSf <- sfConnector.getSfSubs()
  } yield {

    val sfRecords = allSubsToProcessFromSf.records

    val identityConnector = new IdentityConnector(config.identityConfig)
    val consentsCalculator = new ConsentsCalculator(config.consentsMapping)

    val acqSubUpdatesToWriteBackToSf = processAcqSubs(
      identityConnector,
      sfRecords.filter(_.Soft_Opt_in_Status__c.equals("Ready to process acquisition")),
      consentsCalculator
    )

    sfConnector.updateSubsInSf(
      SFSubscription.UpdateRecordRequest(acqSubUpdatesToWriteBackToSf).asJson.spaces2
    )

    val cancSubUpdatesToWriteBackToSf = processCancSubs(
      identityConnector,
      sfConnector,
      sfRecords.filter(_.Soft_Opt_in_Status__c.equals("Ready to process cancellation")),
      consentsCalculator
    )

    sfConnector.updateSubsInSf(
      SFSubscription.UpdateRecordRequest(cancSubUpdatesToWriteBackToSf).asJson.spaces2
    )
  }

  def processAcqSubs(identityConnector: IdentityConnector, acqSubs: Seq[SFSubscription.Record], consentsCalculator: ConsentsCalculator): Seq[SFSubscription.UpdateRecord] = {
    acqSubs.map(sub => {
      buildSfResponse(sub, "Acquisition",
        for {
          consents <- consentsCalculator.getAcqConsents(sub.Product__c)
          consentsBody = consentsCalculator.buildConsentsBody(consents, state = true)
          _ <- identityConnector.sendConsentsReq(sub.Buyer__r.IdentityID__c, consentsBody)
        } yield ())
    })
  }

  def processCancSubs(identityConnector: IdentityConnector, sfConnector: SalesforceConnector, cancSubs: Seq[SFSubscription.Record], consentsCalculator: ConsentsCalculator): Seq[SFSubscription.UpdateRecord] = {
    sfConnector.getActiveSubs(cancSubs.map(sub => sub.Buyer__r.IdentityID__c)) match {
      case Right(activeSubs) =>
        getEnhancedCancSubs(cancSubs, activeSubs.records)
          .map(sub => {
            buildSfResponse(sub.cancelledSub, "Cancellation",
              for {
                consents <- consentsCalculator.getCancConsents(sub.cancelledSub.Product__c, sub.associatedActiveNonGiftSubs.map(_.Product__c).toSet)
                _ <- sendCancConsentsIfPresent(identityConnector, sub.identityId, consents, consentsCalculator)
              } yield ())
          })
      case Left(_) =>
        // TODO: Log Error
        cancSubs.map(failureSFResponse)
    }
  }

  def sendCancConsentsIfPresent(identityConnector: IdentityConnector, identityId: String, consents: Set[String], consentsCalculator: ConsentsCalculator): Either[SoftOptInError, Unit] = {
    if (!consents.isEmpty) {
      val consentsBody = consentsCalculator.buildConsentsBody(consents, state = false)
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

package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models._
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import io.circe.syntax.EncoderOps

// TODO: introduce notifications when number of attempts is incremented to 5
// TODO: Do functional testing
// TODO: Add unit testing

object Main extends App with LazyLogging {

  (for {
    config <- SoftOptInConfig.get
    sfAuthDetails <- SalesforceConnector.auth(config.sfConfig)
    sfConnector = new SalesforceConnector(sfAuthDetails)

    allSubs <- sfConnector.getSfSubs()
    identityConnector = new IdentityConnector(config.identityConfig)
    consentsCalculator = new ConsentsCalculator(config.consentsMapping)

    acqSubs = allSubs.records.filter(_.Soft_Opt_in_Status__c.equals("Ready to process acquisition"))
    _ <- processAcqSubs(acqSubs, identityConnector, sfConnector, consentsCalculator)

    cancSubs = allSubs.records.filter(_.Soft_Opt_in_Status__c.equals("Ready to process cancellation"))
    cancSubsIdentityIds = cancSubs.map(sub => sub.Buyer__r.IdentityID__c)

    activeSubs <- sfConnector.getActiveSubs(cancSubsIdentityIds)
    _ <- processCancSubs(cancSubs, activeSubs, identityConnector, sfConnector, consentsCalculator)
  } yield ())
    .left
    .map(error => {
      // TODO: Surface this error outside of the lambda
      logger.error(s"${error.errorType}: ${error.errorDetails}")
      println(error)
    })


  def processAcqSubs(acqSubs: Seq[SFSubscription.Record], identityConnector: IdentityConnector, sfConnector: SalesforceConnector, consentsCalculator: ConsentsCalculator): Either[SoftOptInError, Unit] = {
    val test = acqSubs
      .map(sub => {
        buildSfResponse(sub, "Acquisition",
          for {
            consents <- consentsCalculator.getAcqConsents(sub.Product__c)
            consentsBody = consentsCalculator.buildConsentsBody(consents, state = true)
            _ <- identityConnector.sendConsentsReq(sub.Buyer__r.IdentityID__c, consentsBody)
          } yield ())
      })

    if (test.isEmpty) Right(())
    else sfConnector.updateSubsInSf(SFSubscription.UpdateRecordRequest(test).asJson.spaces2)
  }

  def processCancSubs(cancSubs: Seq[SFSubscription.Record], activeSubs: AssociatedSFSubscription.RootInterface, identityConnector: IdentityConnector, sfConnector: SalesforceConnector, consentsCalculator: ConsentsCalculator): Either[SoftOptInError, Unit] = {
    val test = getEnhancedCancSubs(cancSubs, activeSubs.records)
      .map(sub => {
        buildSfResponse(sub.cancelledSub, "Cancellation",
          for {
            consents <- consentsCalculator.getCancConsents(sub.cancelledSub.Product__c, sub.associatedActiveNonGiftSubs.map(_.Product__c).toSet)
            _ <- sendCancConsentsIfPresent(identityConnector, sub.identityId, consents, consentsCalculator)
          } yield ())
      })

    if (test.isEmpty) Right(())
    else sfConnector.updateSubsInSf(SFSubscription.UpdateRecordRequest(test).asJson.spaces2)
  }

  def sendCancConsentsIfPresent(identityConnector: IdentityConnector, identityId: String, consents: Set[String], consentsCalculator: ConsentsCalculator): Either[SoftOptInError, Unit] = {
    if (consents.nonEmpty) {
      val consentsBody = consentsCalculator.buildConsentsBody(consents, state = false)
      identityConnector.sendConsentsReq(identityId, consentsBody)
    } else {
      Right(())
    }
  }

  def buildSfResponse(sub: SFSubscription.Record, stage: String, result: Either[SoftOptInError, Unit]): SFSubscription.UpdateRecord = {
    result match {
      case Right(_) => successfulSFResponse(sub, stage)
      case Left(error) =>
        logger.warn(s"${error.errorType}: ${error.errorDetails}")
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

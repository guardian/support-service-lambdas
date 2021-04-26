package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{AssociatedSFSubscription, SFSubscription, SoftOptInConfig, SoftOptInError}
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import io.circe.syntax._

// TODO: introduce notifications when number of attempts is incremented to 5

object Main extends App with LazyLogging {

  val readyToProcessAcqStatus = "Ready to process acquisition"
  val readyToProcessCancStatus = "Ready to process cancellation"

  (for {
    config <- SoftOptInConfig.get
    sfConnector <- SalesforceConnector(config.sfConfig, config.sfApiVersion)

    allSubs <- sfConnector.getSubsToProcess()
    identityConnector = new IdentityConnector(config.identityConfig)
    consentsCalculator = new ConsentsCalculator(config.consentsMapping)

    acqSubs = allSubs.records.filter(_.Soft_Opt_in_Status__c.equals(readyToProcessAcqStatus))
    _ <- processAcquiredSubs(acqSubs, identityConnector.sendConsentsReq, sfConnector.updateSubs, consentsCalculator)

    cancSubs = allSubs.records.filter(_.Soft_Opt_in_Status__c.equals(readyToProcessCancStatus))
    cancSubsIdentityIds = cancSubs.map(sub => sub.Buyer__r.IdentityID__c)

    activeSubs <- sfConnector.getActiveSubs(cancSubsIdentityIds)
    _ <- processCancelledSubs(cancSubs, activeSubs, identityConnector.sendConsentsReq, sfConnector.updateSubs, consentsCalculator)
  } yield ())
    .left
    .map(error => {
      // TODO: Surface this error outside of the lambda for alarm purposes
      logger.error(s"${error.errorType}: ${error.errorDetails}")
    })

  def processAcquiredSubs(acquiredSubs: Seq[SFSubscription.Record], sendConsentsReq: (String, String) => Either[SoftOptInError, Unit], updateSubs: String => Either[SoftOptInError, Unit], consentsCalculator: ConsentsCalculator): Either[SoftOptInError, Unit] = {
    val recordsToUpdate = acquiredSubs
      .map(sub => {
        SFSubscription.UpdateRecord(sub, "Acquisition",
          for {
            consents <- consentsCalculator.getAcquisitionConsents(sub.Product__c)
            consentsBody = consentsCalculator.buildConsentsBody(consents, state = true)
            _ <- sendConsentsReq(sub.Buyer__r.IdentityID__c, consentsBody)
          } yield ())
      })

    if (recordsToUpdate.isEmpty)
      Right(())
    else
      updateSubs(SFSubscription.UpdateRecordRequest(recordsToUpdate).asJson.spaces2)
  }

  def processCancelledSubs(cancSubs: Seq[SFSubscription.Record], activeSubs: AssociatedSFSubscription.Response, sendConsentsReq: (String, String) => Either[SoftOptInError, Unit], updateSubs: String => Either[SoftOptInError, Unit], consentsCalculator: ConsentsCalculator): Either[SoftOptInError, Unit] = {
    def sendCancelationConsents(identityId: String, consents: Set[String]): Either[SoftOptInError, Unit] = {
      if (consents.nonEmpty)
        sendConsentsReq(
          identityId,
          consentsCalculator.buildConsentsBody(consents, state = false)
        )
      else
        Right(())
    }

    val recordsToUpdate = cancSubs
      .map(SFSubscription.EnhancedCancelledSub(_, activeSubs.records))
      .map(sub => {
        SFSubscription.UpdateRecord(sub.cancelledSub, "Cancellation",
          for {
            consents <- consentsCalculator.getCancellationConsents(sub.cancelledSub.Product__c, sub.associatedActiveNonGiftSubs.map(_.Product__c).toSet)
            _ <- sendCancelationConsents(sub.identityId, consents)
          } yield ())
      })

    if (recordsToUpdate.isEmpty)
      Right(())
    else
      updateSubs(SFSubscription.UpdateRecordRequest(recordsToUpdate).asJson.spaces2)
  }

  def getEnhancedCancelledSubs(cancelledSubs: Seq[SFSubscription.Record], associatedSubs: Seq[AssociatedSFSubscription.Record]): Seq[SFSubscription.EnhancedCancelledSub] = {
    cancelledSubs.map(sub => {
      val associatedActiveNonGiftSubs = associatedSubs.filter(_.IdentityID__c.equals(sub.Buyer__r.IdentityID__c))

      SFSubscription.EnhancedCancelledSub(
        identityId = sub.Buyer__r.IdentityID__c,
        cancelledSub = sub,
        associatedActiveNonGiftSubs = associatedActiveNonGiftSubs
      )
    })
  }

}

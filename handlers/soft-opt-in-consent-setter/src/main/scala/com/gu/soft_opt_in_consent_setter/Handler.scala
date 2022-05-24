package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{EnhancedCancelledSub, SFAssociatedSubResponse, SFSubRecord, SFSubRecordUpdate, SFSubRecordUpdateRequest, SoftOptInConfig, SoftOptInError}
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import io.circe.syntax._

object Handler extends LazyLogging {

  val readyToProcessAcquisitionStatus = "Ready to process acquisition"
  val readyToProcessCancellationStatus = "Ready to process cancellation"

  def main(args: Array[String]): Unit = {
    handleRequest()
  }

  def handleRequest(): Unit = {
    (for {
      config <- SoftOptInConfig()
    } yield for {
      sfConnector <- SalesforceConnector(config.sfConfig, config.sfApiVersion)

      _ = logger.info(s"About to fetch subs to process from Salesforce")
      allSubs <- sfConnector.getSubsToProcess()
      _ = logger.info(s"Successfully fetched ${allSubs.records.length} subs from Salesforce")

      identityConnector = new IdentityConnector(config.identityConfig)
      consentsCalculator = new ConsentsCalculator(config.consentsMapping)

      acqSubs = allSubs.records.filter(_.Soft_Opt_in_Status__c.equals(readyToProcessAcquisitionStatus))
      _ <- processAcquiredSubs(acqSubs, identityConnector.sendConsentsReq, sfConnector.updateSubs, consentsCalculator)

      cancelledSubs = allSubs.records.filter(_.Soft_Opt_in_Status__c.equals(readyToProcessCancellationStatus))
      cancelledSubsIdentityIds = cancelledSubs.map(sub => sub.Buyer__r.IdentityID__c)

      _ = logger.info(s"About to fetch active subs from Salesforce")
      activeSubs <- sfConnector.getActiveSubs(cancelledSubsIdentityIds)
      _ = logger.info(s"Successfully fetched ${activeSubs.records.length} active subs from Salesforce")

      _ <- processCancelledSubs(cancelledSubs, activeSubs, identityConnector.sendConsentsReq, sfConnector.updateSubs, consentsCalculator)
      _ = Metrics.put(event = "successful_run")
    } yield ())
      .flatten
      .left
      .foreach(error => {
        Metrics.put(event = "failed_run")
        logger.error(s"${error.errorType}: ${error.errorDetails}")
        throw new Exception(s"Run failed due to ${error.errorType}: ${error.errorDetails}")
      })
  }

  def processAcquiredSubs(acquiredSubs: Seq[SFSubRecord], sendConsentsReq: (String, String) => Either[SoftOptInError, Unit], updateSubs: String => Either[SoftOptInError, Unit], consentsCalculator: ConsentsCalculator): Either[SoftOptInError, Unit] = {
    Metrics.put(event = "acquisitions_to_process", acquiredSubs.size)

    val recordsToUpdate = acquiredSubs
      .map(sub => {
        val updateResult =
          for {
            consents <- consentsCalculator.getAcquisitionConsents(sub.Product__c)
            consentsBody = consentsCalculator.buildConsentsBody(consents, state = true)
            _ <- sendConsentsReq(sub.Buyer__r.IdentityID__c, consentsBody)
          } yield ()

        logErrors(updateResult)

        SFSubRecordUpdate(sub, "Acquisition", updateResult)
      })

    emitIdentityMetrics(recordsToUpdate)

    if (recordsToUpdate.isEmpty)
      Right(())
    else
      updateSubs(SFSubRecordUpdateRequest(recordsToUpdate).asJson.spaces2)
  }

  def processCancelledSubs(cancelledSubs: Seq[SFSubRecord], activeSubs: SFAssociatedSubResponse, sendConsentsReq: (String, String) => Either[SoftOptInError, Unit], updateSubs: String => Either[SoftOptInError, Unit], consentsCalculator: ConsentsCalculator): Either[SoftOptInError, Unit] = {
    def sendCancellationConsents(identityId: String, consents: Set[String]): Either[SoftOptInError, Unit] = {
      if (consents.nonEmpty)
        sendConsentsReq(
          identityId,
          consentsCalculator.buildConsentsBody(consents, state = false)
        )
      else
        Right(())
    }

    Metrics.put(event = "cancellations_to_process", cancelledSubs.size)

    val recordsToUpdate = cancelledSubs
      .map(EnhancedCancelledSub(_, activeSubs.records))
      .map(sub => {
        val updateResult =
          for {
            consents <- consentsCalculator.getCancellationConsents(sub.cancelledSub.Product__c, sub.associatedActiveNonGiftSubs.map(_.Product__c).toSet)
            _ <- sendCancellationConsents(sub.identityId, consents)
          } yield ()

        logErrors(updateResult)

        SFSubRecordUpdate(sub.cancelledSub, "Cancellation", updateResult)
      })

    emitIdentityMetrics(recordsToUpdate)

    if (recordsToUpdate.isEmpty)
      Right(())
    else
      updateSubs(SFSubRecordUpdateRequest(recordsToUpdate).asJson.spaces2)
  }

  def logErrors(updateResults: Either[SoftOptInError, Unit]): Unit = {
    updateResults.left.foreach(error =>
      logger.warn(s"${error.errorType}: ${error.errorDetails}"))
  }

  def emitIdentityMetrics(records: Seq[SFSubRecordUpdate]): Unit = {
    // Soft_Opt_in_Number_of_Attempts__c == 0 means the consents were set successfully
    val successfullyUpdated = records.count(_.Soft_Opt_in_Number_of_Attempts__c == 0)
    val unsuccessfullyUpdated = records.count(_.Soft_Opt_in_Number_of_Attempts__c > 0)

    Metrics.put(event = "successful_consents_updates", successfullyUpdated)
    Metrics.put(event = "failed_consents_updates", unsuccessfullyUpdated)
  }

}

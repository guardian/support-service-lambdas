package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.{
  EnhancedCancelledSub,
  EnhancedProductSwitchSub,
  IdapiUserResponse,
  SFAssociatedSubResponse,
  SFSubRecord,
  SFSubRecordUpdate,
  SFSubRecordUpdateRequest,
  SoftOptInConfig,
  SoftOptInError,
  SubscriptionRatePlanUpdateRecord,
}
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
      productSwitchSubs <- sfConnector.getProductSwitchSubsToProcess()
      _ = logger.info(
        s"Successfully fetched ${allSubs.records.length + productSwitchSubs.records.length} subs from Salesforce",
      )

      identityConnector = new IdentityConnector(config.identityConfig)
      consentsCalculator = new ConsentsCalculator(config.consentsMapping)

      acqSubs = allSubs.records.filter(_.Soft_Opt_in_Status__c.equals(readyToProcessAcquisitionStatus))
      _ <- processAcquiredSubs(acqSubs, identityConnector.sendConsentsReq, sfConnector.updateSubs, consentsCalculator)

      cancelledSubs = allSubs.records.filter(_.Soft_Opt_in_Status__c.equals(readyToProcessCancellationStatus))
      cancelledSubsIdentityIds = cancelledSubs.map(sub => sub.Buyer__r.IdentityID__c)
      productSwitchSubIdentityIds = productSwitchSubs.records.map(sub => sub.Buyer__r.IdentityID__c)

      _ = logger.info(s"About to fetch active subs from Salesforce")
      activeSubs <- sfConnector.getActiveSubs(cancelledSubsIdentityIds ++ productSwitchSubIdentityIds)
      _ = logger.info(s"Successfully fetched ${activeSubs.records.length} active subs from Salesforce")

      _ <- processProductSwitchSubs(
        productSwitchSubs.records,
        activeSubs,
        identityConnector.getConsentsReq,
        identityConnector.sendConsentsReq,
        sfConnector.updateSubs,
        consentsCalculator,
      )

      _ <- processCancelledSubs(
        cancelledSubs,
        activeSubs,
        identityConnector.sendConsentsReq,
        sfConnector.updateSubs,
        consentsCalculator,
      )
      _ = Metrics.put(event = "successful_run")
    } yield ()).flatten.left
      .foreach(error => {
        Metrics.put(event = "failed_run")
        logger.error(s"${error.errorType}: ${error.errorDetails}")
        throw new Exception(s"Run failed due to ${error.errorType}: ${error.errorDetails}")
      })
  }

  def processAcquiredSubs(
      acquiredSubs: Seq[SFSubRecord],
      sendConsentsReq: (String, String) => Either[SoftOptInError, Unit],
      updateSubs: String => Either[SoftOptInError, Unit],
      consentsCalculator: ConsentsCalculator,
  ): Either[SoftOptInError, Unit] = {
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

        SFSubRecordUpdate(
          sub.Id,
          "Acquisition",
          sub.Soft_Opt_in_Number_of_Attempts__c,
          sub.Soft_Opt_in_Last_Stage_Processed__c,
          updateResult,
        )
      })

    emitIdentityMetrics(recordsToUpdate)

    if (recordsToUpdate.isEmpty)
      Right(())
    else
      updateSubs(SFSubRecordUpdateRequest(recordsToUpdate).asJson.spaces2)
  }

  // 1. carry across current consents (no action required)
  // 2. Disable any current consents if moving to a product which doesn't have these soft opt-ins
  // 3. Add new consents

  // 2. if old not in new, disable
  // 3. if new not in old, enable
  def processProductSwitchSubs(
      productSwitchSubs: Seq[SubscriptionRatePlanUpdateRecord],
      activeSubs: SFAssociatedSubResponse,
      getConsentsReq: String => Either[SoftOptInError, IdapiUserResponse],
      sendConsentsReq: (String, String) => Either[SoftOptInError, Unit],
      updateSubs: String => Either[SoftOptInError, Unit],
      consentsCalculator: ConsentsCalculator,
  ): Either[SoftOptInError, Unit] = {
    Metrics.put(event = "product_switches_to_process", productSwitchSubs.size)

    val recordsToUpdate = productSwitchSubs
      .map(EnhancedProductSwitchSub(_, activeSubs.records))
      .map(sub => {
        import sub._

        val updateResult =
          for {
            consents <- consentsCalculator.getProductSwitchConsents(
              productSwitchSub.Old_Product__c,
              productSwitchSub.SF_Subscription__r.Product__c,
              sub.associatedActiveNonGiftSubs.map(_.Product__c),
            )

            oldProductSoftOptIns = consents._1
            newProductSoftOptIns = consents._2

            idapiResponse <- getConsentsReq(productSwitchSub.Buyer__r.IdentityID__c)
            currentConsents = idapiResponse.user.consents
              .filter(consentOption => oldProductSoftOptIns.contains(consentOption.id))

            toRemove = currentConsents
              .filter(consentOption => !newProductSoftOptIns.contains(consentOption.id) && consentOption.consented)
              .map(_.id)

            consentsToRemoveBody = consentsCalculator.buildConsentsBody(toRemove.toSet, state = false)
            consentsToAddBody = consentsCalculator.buildConsentsBody(newProductSoftOptIns, state = true)
            _ <- sendConsentsReq(productSwitchSub.Buyer__r.IdentityID__c, consentsToRemoveBody + consentsToAddBody)
          } yield ()

        logErrors(updateResult)

        SFSubRecordUpdate(
          productSwitchSub.Id,
          "Switch",
          productSwitchSub.SF_Subscription__r.Soft_Opt_in_Number_of_Attempts__c,
          productSwitchSub.SF_Subscription__r.Soft_Opt_in_Last_Stage_Processed__c,
          updateResult,
        )
      })

    emitIdentityMetrics(recordsToUpdate)

    if (recordsToUpdate.isEmpty)
      Right(())
    else
      updateSubs(SFSubRecordUpdateRequest(recordsToUpdate).asJson.spaces2)
  }

  def processCancelledSubs(
      cancelledSubs: Seq[SFSubRecord],
      activeSubs: SFAssociatedSubResponse,
      sendConsentsReq: (String, String) => Either[SoftOptInError, Unit],
      updateSubs: String => Either[SoftOptInError, Unit],
      consentsCalculator: ConsentsCalculator,
  ): Either[SoftOptInError, Unit] = {
    def sendCancellationConsents(identityId: String, consents: Set[String]): Either[SoftOptInError, Unit] = {
      if (consents.nonEmpty)
        sendConsentsReq(
          identityId,
          consentsCalculator.buildConsentsBody(consents, state = false),
        )
      else
        Right(())
    }

    Metrics.put(event = "cancellations_to_process", cancelledSubs.size)

    val recordsToUpdate = cancelledSubs
      .map(EnhancedCancelledSub(_, activeSubs.records))
      .map(sub => {
        import sub._

        val updateResult =
          for {
            consents <- consentsCalculator.getCancellationConsents(
              cancelledSub.Product__c,
              associatedActiveNonGiftSubs.map(_.Product__c).toSet,
            )
            _ <- sendCancellationConsents(sub.identityId, consents)
          } yield ()

        logErrors(updateResult)

        SFSubRecordUpdate(
          cancelledSub.Id,
          "Cancellation",
          cancelledSub.Soft_Opt_in_Number_of_Attempts__c,
          cancelledSub.Soft_Opt_in_Last_Stage_Processed__c,
          updateResult,
        )
      })

    emitIdentityMetrics(recordsToUpdate)

    if (recordsToUpdate.isEmpty)
      Right(())
    else
      updateSubs(SFSubRecordUpdateRequest(recordsToUpdate).asJson.spaces2)
  }

  def logErrors(updateResults: Either[SoftOptInError, Unit]): Unit = {
    updateResults.left.foreach(error => logger.warn(s"${error.errorType}: ${error.errorDetails}"))
  }

  def emitIdentityMetrics(records: Seq[SFSubRecordUpdate]): Unit = {
    // Soft_Opt_in_Number_of_Attempts__c == 0 means the consents were set successfully
    val successfullyUpdated = records.count(_.Soft_Opt_in_Number_of_Attempts__c == 0)
    val unsuccessfullyUpdated = records.count(_.Soft_Opt_in_Number_of_Attempts__c > 0)

    Metrics.put(event = "successful_consents_updates", successfullyUpdated)
    Metrics.put(event = "failed_consents_updates", unsuccessfullyUpdated)
  }

}

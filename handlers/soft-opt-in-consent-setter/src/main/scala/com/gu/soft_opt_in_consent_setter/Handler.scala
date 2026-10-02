package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.ConsentsMapping.similarGuardianProducts
import com.gu.soft_opt_in_consent_setter.models.{
  ConsentsMapping,
  EnhancedSub,
  SFAssociatedSubResponse,
  SFSubRecord,
  SFSubRecordUpdate,
  SFSubRecordUpdateRequest,
  SoftOptInConfig,
  SoftOptInError,
}
import com.typesafe.scalalogging.LazyLogging
import io.circe.syntax._

object Handler extends LazyLogging {

  type RecordMetric = (String, Int) => Unit
  val publishMetric: RecordMetric = (event, value) => {
    Metrics.put(event, value.toDouble)
    ()
  }

  val readyToProcessAcquisitionStatus = "Ready to process acquisition"
  val readyToProcessCancellationStatus = "Ready to process cancellation"
  val readyProcessSwitchStatus = "Ready to process switch"

  def main(args: Array[String]): Unit = {
    handleRequest()
  }

  def handleRequest(): Unit = {
    (for {
      config <- SoftOptInConfig(sys.env.get("Stage"), sys.env.get("sfApiVersion"))
    } yield
      for {
        sfConnector <- SalesforceConnector(config.sfConfig, config.sfApiVersion)

        _ = logger.info(s"About to fetch subs to process from Salesforce")
        allSubs <- sfConnector.getSubsToProcess()
        _ = logger.info(
          s"Successfully fetched ${allSubs.records.length} subs from Salesforce",
        )

        identityConnector = new IdentityConnector(config.identityConfig)
        consentsCalculator = new ConsentsCalculator(ConsentsMapping.consentsMapping)

        acqSubs = allSubs.records.filter(_.Soft_Opt_in_Status__c.equals(readyToProcessAcquisitionStatus))
        _ <- markAcquiredSubsProcessed(acqSubs, sfConnector.updateSubs)

        cancelledSubs = allSubs.records.filter(_.Soft_Opt_in_Status__c.equals(readyToProcessCancellationStatus))
        cancelledSubsIdentityIds = cancelledSubs.map(sub => sub.Buyer__r.IdentityID__c)

        productSwitchSubs = allSubs.records.filter(_.Soft_Opt_in_Status__c.equals(readyProcessSwitchStatus))
        productSwitchSubIdentityIds = productSwitchSubs.map(sub => sub.Buyer__r.IdentityID__c)

        _ = logger.info(s"About to fetch active subs from Salesforce")
        activeSubs <- sfConnector.getActiveSubs((cancelledSubsIdentityIds ++ productSwitchSubIdentityIds).distinct)
        _ = logger.info(s"Successfully fetched ${activeSubs.records.length} active subs from Salesforce")

        multipleAccountApi <- MultipleAccountApiConnector.create(config.stage)
        checkSecondaryAccess = multipleAccountApi.hasActiveSecondaryUserAccess _
        _ <- processProductSwitchSubs(
          productSwitchSubs,
          activeSubs,
          identityConnector.sendConsentsReq,
          sfConnector.updateSubs,
          consentsCalculator,
          checkSecondaryAccess,
        )
        _ <- processCancelledSubs(
          cancelledSubs,
          activeSubs,
          identityConnector.sendConsentsReq,
          sfConnector.updateSubs,
          consentsCalculator,
          checkSecondaryAccess,
          publishMetric,
        )
        _ = Metrics.put(event = "successful_run")
      } yield ()).flatten.left
      .foreach(error => {
        Metrics.put(event = "failed_run")
        logger.error(s"${error.getMessage}")
        throw new Exception(s"Run failed due to ${error.getMessage}")
      })
  }

  def markAcquiredSubsProcessed(
      acquiredSubs: Seq[SFSubRecord],
      updateSubs: String => Either[SoftOptInError, Unit],
  ): Either[SoftOptInError, Unit] = {
    Metrics.put(event = "acquisitions_to_process", acquiredSubs.size)

    val recordsToUpdate = acquiredSubs
      .map(sub => {
        // as cleanup, we could stop salesforce making these available in the first place
        logger.info(
          s"acquisition consents are set via event bus/queue, marking as processed: ${sub.Name} on ${sub.Buyer__r.IdentityID__c}",
        )
        SFSubRecordUpdate.successfulUpdate(
          sub,
          "Acquisition",
        )
      })

    emitIdentityMetrics(recordsToUpdate)

    if (recordsToUpdate.isEmpty)
      Right(())
    else
      updateSubs(SFSubRecordUpdateRequest(recordsToUpdate).asJson.spaces2)
  }

  def buildProductSwitchConsents(
      oldProductName: String,
      newProductName: String,
      allProductsForUser: Set[String],
      consentsCalculator: ConsentsCalculator,
  ): Either[SoftOptInError, String] = {
    import consentsCalculator._

    for {
      oldProductSoftOptIns <- getSoftOptInsByProduct(oldProductName)
      newProductSoftOptIns <- getSoftOptInsByProduct(newProductName)
      currentProductSoftOptIns <- getSoftOptInsByProducts(allProductsForUser)
      allOtherProductSoftOptIns <- getSoftOptInsByProducts(allProductsForUser - newProductName)

      toRemove = oldProductSoftOptIns.diff(currentProductSoftOptIns).map(ConsentsObject(_, false))
      toAdd = newProductSoftOptIns
        .filter(option => !oldProductSoftOptIns.contains(option) && !allOtherProductSoftOptIns.contains(option))
        .filterNot(_ == similarGuardianProducts)
        .map(ConsentsObject(_, true))

      consentsBody = (toRemove ++ toAdd).asJson.toString()
    } yield consentsBody
  }

  def processProductSwitchSubs(
      productSwitchSubs: Seq[SFSubRecord],
      activeSubs: SFAssociatedSubResponse,
      sendConsentsReq: (String, String) => Either[SoftOptInError, Unit],
      updateSubs: String => Either[SoftOptInError, Unit],
      consentsCalculator: ConsentsCalculator,
      hasActiveSecondaryUserAccess: String => Either[SoftOptInError, Boolean],
      recordMetric: RecordMetric = publishMetric,
  ): Either[SoftOptInError, Unit] = {
    recordMetric("product_switches_to_process", productSwitchSubs.size)

    val checkedSubs = productSwitchSubs
      .to(LazyList)
      .map(EnhancedSub(_, activeSubs.records))
      .map(rec => rec -> hasActiveSecondaryUserAccess(rec.identityId))

    failRunIfNeeded(checkedSubs.map(_._2)).flatMap { _ =>
      val recordsToUpdate = checkedSubs.map { case (rec, secondaryAccess) =>
        import rec._

        val updateResult = for {
          ratePlanUpdates <- sub.Subscription_Rate_Plan_Updates__r
            .toRight(
              SoftOptInError(
                s"processProductSwitchSubs: Subscription ${sub.Name} Subscription_Rate_Plan_Updates__r is null",
              ),
            )
          hasActiveAccess <- secondaryAccess
          productsFromSalesforce = associatedActiveNonGiftSubs.map(_.Product__c).toSet
          consentsBody <- buildProductSwitchConsents(
            ratePlanUpdates.records.head.Previous_Product_Name__c,
            sub.Product__c,
            productsWithSecondaryAccess(productsFromSalesforce, hasActiveAccess),
            consentsCalculator,
          )
          res <- sendConsentsReq(sub.Buyer__r.IdentityID__c, consentsBody)
        } yield res

        logErrors(updateResult)

        SFSubRecordUpdate(sub, "Switch", updateResult)
      }

      emitIdentityMetrics(recordsToUpdate, recordMetric)

      if (recordsToUpdate.isEmpty)
        Right(())
      else
        updateSubs(SFSubRecordUpdateRequest(recordsToUpdate).asJson.spaces2)
    }
  }

  def processCancelledSubs(
      cancelledSubs: Seq[SFSubRecord],
      activeSubs: SFAssociatedSubResponse,
      sendConsentsReq: (String, String) => Either[SoftOptInError, Unit],
      updateSubs: String => Either[SoftOptInError, Unit],
      consentsCalculator: ConsentsCalculator,
      hasActiveSecondaryUserAccess: String => Either[SoftOptInError, Boolean],
      recordMetric: RecordMetric,
  ): Either[SoftOptInError, Unit] = {
    recordMetric("cancellations_to_process", cancelledSubs.size)

    val checkedSubs = cancelledSubs
      .to(LazyList)
      .map(EnhancedSub(_, activeSubs.records))
      .map(rec => rec -> hasActiveSecondaryUserAccess(rec.identityId))

    failRunIfNeeded(checkedSubs.map(_._2)).flatMap { _ =>
      val recordsToUpdate = checkedSubs.map { case (rec, secondaryAccess) =>
        processCancelledSub(rec, sendConsentsReq, consentsCalculator, secondaryAccess)
      }

      emitIdentityMetrics(recordsToUpdate, recordMetric)

      if (recordsToUpdate.isEmpty)
        Right(())
      else
        updateSubs(SFSubRecordUpdateRequest(recordsToUpdate).asJson.spaces2)
    }
  }

  private def failRunIfNeeded(results: Seq[Either[SoftOptInError, Boolean]]): Either[SoftOptInError, Unit] =
    results.collectFirst { case Left(error) if error.failRun => error } match {
      case Some(error) => Left(error)
      case None => Right(())
    }

  private[soft_opt_in_consent_setter] def processCancelledSub(
      rec: EnhancedSub,
      sendConsentsReq: (String, String) => Either[SoftOptInError, Unit],
      consentsCalculator: ConsentsCalculator,
      secondaryAccess: Either[SoftOptInError, Boolean],
  ): SFSubRecordUpdate = {
    import rec._

    def sendCancellationConsents(identityId: String, consents: Set[String]): Either[SoftOptInError, Unit] = {
      if (consents.nonEmpty) {
        sendConsentsReq(
          identityId,
          consentsCalculator.buildConsentsBody(consents.map(_ -> false).toMap),
        )
      } else {
        Right(())
      }
    }

    val updateResult =
      for {
        hasActiveAccess <- secondaryAccess
        productsFromSalesforce = associatedActiveNonGiftSubs.map(_.Product__c).toSet
        consents <- consentsCalculator.getCancellationConsents(
          sub.Product__c,
          productsWithSecondaryAccess(productsFromSalesforce, hasActiveAccess),
        )
        consentWithoutSimilarProducts = consentsCalculator.removeSimilarGuardianProductFromSet(consents)
        _ <- sendCancellationConsents(identityId, consentWithoutSimilarProducts)
      } yield ()

    logErrors(updateResult)

    SFSubRecordUpdate(sub, "Cancellation", updateResult)
  }

  def logErrors(updateResults: Either[SoftOptInError, Unit]): Unit = {
    updateResults.left.foreach(error => logger.warn(s"${error.getMessage}"))
  }

  def productsWithSecondaryAccess(activeProductNames: Set[String], hasActiveSecondaryUserAccess: Boolean): Set[String] =
    if (hasActiveSecondaryUserAccess) activeProductNames + "Secondary User" else activeProductNames

  def emitIdentityMetrics(records: Seq[SFSubRecordUpdate], recordMetric: RecordMetric = publishMetric): Unit = {
    // Soft_Opt_in_Number_of_Attempts__c == 0 means the consents were set successfully
    val successfullyUpdated = records.count(_.Soft_Opt_in_Number_of_Attempts__c == 0)
    val unsuccessfullyUpdated = records.count(_.Soft_Opt_in_Number_of_Attempts__c > 0)

    recordMetric("successful_consents_updates", successfullyUpdated)
    recordMetric("failed_consents_updates", unsuccessfullyUpdated)
  }

}

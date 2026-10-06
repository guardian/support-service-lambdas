package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.HandlerIAP.{Acquisition, Cancellation, MessageBody, Switch, rethrowError}
import com.gu.soft_opt_in_consent_setter.models.ConsentsMapping.similarGuardianProducts
import com.gu.soft_opt_in_consent_setter.models.{ConsentsMapping, EnhancedSub, SoftOptInConfig, SoftOptInError}
import com.typesafe.scalalogging.StrictLogging

import scala.util.{Failure, Success}

class IAPMessageProcessor(
    sfConnector: SalesforceConnector,
    identityConnector: IdentityConnector,
    consentsCalculator: ConsentsCalculator,
    mpapiConnector: MpapiConnector,
    dynamoConnector: DynamoConnector,
    multipleAccountApiConnector: MultipleAccountApiConnector,
) extends StrictLogging {

  import IAPMessageProcessor._

  private val getSecondarySubscriptionNames: String => Either[SoftOptInError, Set[String]] =
    multipleAccountApiConnector.activeSecondarySubscriptionNames

  def processMessage(message: MessageBody): Any = {
    logger.info(s"Processing message: $message")

    val result = message.eventType match {
      case Acquisition =>
        Metrics.put(event = "acquisitions_to_process", 1)

        processAcquiredSub(
          message,
          identityConnector.sendConsentsReq,
          consentsCalculator,
        )
      case Cancellation =>
        Metrics.put(event = "cancellations_to_process", 1)

        processCancelledSub(
          message,
          identityConnector.sendConsentsReq,
          mpapiConnector.getMobileSubscriptions,
          consentsCalculator,
          sfConnector,
          getSecondarySubscriptionNames,
        )
      case Switch =>
        Metrics.put(event = "product_switches_to_process", 1)

        processProductSwitchSub(
          message,
          identityConnector.sendConsentsReq,
          mpapiConnector.getMobileSubscriptions,
          consentsCalculator,
          sfConnector,
          getSecondarySubscriptionNames,
        )
    }

    emitIdentityMetric(result)

    result match {
      case Left(e) => rethrowError(e)
      case Right(_) =>
        dynamoConnector.updateLoggingTable(message.subscriptionId, message.identityId, message.eventType) match {
          case Success(_) =>
            logger.info("Logged soft opt-in setting to Dynamo")
          case Failure(exception) =>
            logger.error(s"Dynamo write failed for identityId: ${message.identityId}\n$exception")
            logger.error(s"Exception: ${exception.getMessage}")
            Metrics.put("failed_dynamo_update")
        }
    }
  }

}

object IAPMessageProcessor extends StrictLogging {

  def create(maybeStage: Option[String], maybeSfApiVersion: Option[String]): IAPMessageProcessor = {
    val clients = for {
      stage <- maybeStage.toRight(new SoftOptInError("stage is missing", null))
      config <- SoftOptInConfig(maybeStage, maybeSfApiVersion)
      sfConnector <- SalesforceConnector(config.sfConfig, config.sfApiVersion)
      dynamoConnector <- DynamoConnector(stage)

      identityConnector = new IdentityConnector(config.identityConfig)
      consentsCalculator = new ConsentsCalculator(ConsentsMapping.consentsMapping)
      mpapiConnector = new MpapiConnector(config.mpapiConfig)
      multipleAccountApiConnector <- MultipleAccountApiConnector.create(stage)
    } yield new IAPMessageProcessor(
      sfConnector,
      identityConnector,
      consentsCalculator,
      mpapiConnector,
      dynamoConnector,
      multipleAccountApiConnector,
    )

    clients match {
      case Left(error) => rethrowError(error)
      case Right(x) =>
        logger.info("Setup successful")
        x
    }
  }

  private[soft_opt_in_consent_setter] def processAcquiredSub(
      message: MessageBody,
      sendConsentsReq: (String, String) => Either[SoftOptInError, Unit],
      consentsCalculator: ConsentsCalculator,
  ): Either[SoftOptInError, Unit] = {
    val mappingProductName = ConsentsMapping.productMappings(message.productName, message.printProduct)
    for {
      consentKeys <- consentsCalculator.getSoftOptInsByProduct(mappingProductName)
      implicitConsents = consentKeys.map(_ -> true).toMap
      explicitConsents: Map[String, Boolean] =
        message.userConsentsOverrides
          .flatMap(_.similarGuardianProducts.map(similarGuardianProducts -> _))
          .toMap
      mergedConsents = implicitConsents ++ explicitConsents
      consentsBody = consentsCalculator.buildConsentsBody(mergedConsents)
      _ = logger.info(
        s"(acquisition) Sending consents request for identityId ${message.identityId} with payload: $consentsBody",
      )
      _ <- sendConsentsReq(message.identityId, consentsBody)
    } yield ()
  }

  private[soft_opt_in_consent_setter] def processProductSwitchSub(
      messageBody: MessageBody,
      sendConsentsReq: (String, String) => Either[SoftOptInError, Unit],
      getMobileSubscriptions: String => Either[SoftOptInError, MobileSubscriptions],
      consentsCalculator: ConsentsCalculator,
      sfConnector: SalesforceConnector,
      getSecondarySubscriptionNames: String => Either[SoftOptInError, Set[String]],
  ): Either[SoftOptInError, Unit] =
    for {
      previousProductName <- messageBody.previousProductName.toRight(
        SoftOptInError("Missing data: Product switch event is missing previousProductName property"),
      )

      mobileSubscriptionsResponse <- getMobileSubscriptions(messageBody.identityId)
      activeSubs <- sfConnector.getActiveSubs(Seq(messageBody.identityId))
      secondarySubscriptions <- getSecondarySubscriptionNames(messageBody.identityId)

      iapSOIs = mobileSubscriptionsResponse.subscriptions
        .filter(_.valid)
        .map(_.softOptInProductName)
        .distinct

      rec = EnhancedSub.fromSQS(
        messageBody.identityId,
        activeSubs.records,
        iapSOIs,
        secondarySubscriptions,
        messageBody.subscriptionId,
      )

      consentsBody <- consentsCalculator.buildProductSwitchConsents(
        previousProductName,
        messageBody.productName,
        rec.productNames,
      )

      res <- {
        logger.info(
          s"(product switch) Sending consents request for identityId ${messageBody.identityId} with payload: $consentsBody",
        )
        sendConsentsReq(messageBody.identityId, consentsBody)
      }
    } yield res

  private[soft_opt_in_consent_setter] def processCancelledSub(
      messageBody: MessageBody,
      sendConsentsReq: (String, String) => Either[SoftOptInError, Unit],
      getMobileSubscriptions: String => Either[SoftOptInError, MobileSubscriptions],
      consentsCalculator: ConsentsCalculator,
      sfConnector: SalesforceConnector,
      getSecondarySubscriptionNames: String => Either[SoftOptInError, Set[String]],
  ): Either[SoftOptInError, Unit] = {
    for {
      mobileSubscriptionsResponse <- getMobileSubscriptions(messageBody.identityId)
      activeSubs <- sfConnector.getActiveSubs(Seq(messageBody.identityId))
      secondarySubscriptions <- getSecondarySubscriptionNames(messageBody.identityId)

      iapSOIs = mobileSubscriptionsResponse.subscriptions
        .filter(_.valid)
        .map(_.softOptInProductName)
        .distinct
      rec = EnhancedSub.fromSQS(
        messageBody.identityId,
        activeSubs.records,
        iapSOIs,
        secondarySubscriptions,
        messageBody.subscriptionId,
      )

      consents <- consentsCalculator.getCancellationConsents(
        messageBody.productName,
        rec.productNames,
      )
      consentWithoutSimilarProducts = consentsCalculator.removeSimilarGuardianProductFromSet(consents)
      _ <- consentsCalculator.sendCancellationConsents(
        messageBody.identityId,
        consentWithoutSimilarProducts,
        sendConsentsReq,
      )
    } yield ()
  }

  private def emitIdentityMetric(updateResults: Either[SoftOptInError, Unit]): Unit = {
    updateResults match {
      case Left(_) => Metrics.put(event = "failed_consents_updates", 1)
      case Right(_) => Metrics.put(event = "successful_consents_updates", 1)
    }
  }

}

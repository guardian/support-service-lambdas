package com.gu.soft_opt_in_consent_setter

import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.gu.soft_opt_in_consent_setter.models._
import com.typesafe.scalalogging.LazyLogging
import io.circe.{Decoder, ParsingFailure}
import io.circe.parser.{decode => circeDecode}
import io.circe.generic.auto._
import io.circe.syntax._

import scala.jdk.CollectionConverters._
object HandlerIAP extends LazyLogging with RequestHandler[SQSEvent, Unit] {

  val readyToProcessAcquisitionStatus = "Ready to process acquisition"
  val readyToProcessCancellationStatus = "Ready to process cancellation"
  val readyProcessSwitchStatus = "Ready to process switch"
  case class MessageBody(
      identityId: String,
      eventType: String,
      productType: String,
      previousProductType: Option[String],
  )

  private def handleError[T <: Exception](exception: T) = {
    Metrics.put(event = "failed_run")
    logger.error(s"${exception.getMessage}")
    throw exception
  }

  override def handleRequest(input: SQSEvent, context: Context): Unit = {
    val messages =
      input.getRecords.asScala.toList.map(message =>
        circeDecode[MessageBody](message.getBody) match {
          case Left(pf: ParsingFailure) =>
            val exception = SoftOptInError(
              s"Error '${pf.message}' when decoding JSON to MessageBody with cause :${pf.getCause} with body: ${message.getBody}",
            )
            handleError(exception)
          case Left(_) =>
            val exception =
              SoftOptInError(s"Unknown error when decoding JSON to MessageBody with body: ${message.getBody}")
            handleError(exception)
          case Right(result) => result
        },
      )

    val setup = for {
      config <- SoftOptInConfig()
      sfConnector <- SalesforceConnector(config.sfConfig, config.sfApiVersion)

      identityConnector = new IdentityConnector(config.identityConfig)
      consentsCalculator = new ConsentsCalculator(config.consentsMapping)
      mpapiConnector = new MpapiConnector(config.mpapiConfig)
    } yield (sfConnector, identityConnector, consentsCalculator, mpapiConnector)

    val (sfConnector, identityConnector, consentsCalculator, mpapiConnector) = setup match {
      case Left(error) => handleError(error)
      case Right(x) => x
    }

    messages.foreach { message =>
      val result = message.eventType match {
        case "Acquisition" =>
          processAcquiredSub(
            message,
            identityConnector.sendConsentsReq,
            consentsCalculator,
          )
        case "Cancellation" =>
          processCancelledSub(
            message,
            identityConnector.sendConsentsReq,
            mpapiConnector.getMobileSubscriptions,
            consentsCalculator,
            sfConnector,
          )
        case "Switch" =>
          processProductSwitchSub(
            message,
            identityConnector.sendConsentsReq,
            mpapiConnector.getMobileSubscriptions,
            consentsCalculator,
            sfConnector,
          )
      }

      result match {
        case Left(error) => handleError(error)
      }
    }

    Metrics.put(event = "successful_run")
  }

  def processAcquiredSub(
      message: MessageBody,
      sendConsentsReq: (String, String) => Either[SoftOptInError, Unit],
      consentsCalculator: ConsentsCalculator,
  ): Either[SoftOptInError, Unit] = {
    Metrics.put(event = "acquisitions_to_process", 1)

    val updateResult =
      for {
        consents <- consentsCalculator.getSoftOptInsByProduct(message.productType)
        consentsBody = consentsCalculator.buildConsentsBody(consents, state = true)
        _ <- sendConsentsReq(message.identityId, consentsBody)
      } yield ()

    logErrors(updateResult)
    emitIdentityMetrics(updateResult)

    updateResult
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
        .map(ConsentsObject(_, true))
      consentsBody = (toRemove ++ toAdd).asJson.toString()
    } yield consentsBody
  }

  def processProductSwitchSub(
      messageBody: MessageBody,
      sendConsentsReq: (String, String) => Either[SoftOptInError, Unit],
      getMobileSubscriptions: String => Either[SoftOptInError, MobileSubscriptions],
      consentsCalculator: ConsentsCalculator,
      sfConnector: SalesforceConnector,
  ): Either[SoftOptInError, Unit] = {
    Metrics.put(event = "product_switches_to_process", 1)

    val updateResult = for {
      previousProductType <- messageBody.previousProductType.toRight(
        SoftOptInError("Missing data: Product switch event is missing previousProductType property"),
      )

      mobileSubscriptionsResponse <- getMobileSubscriptions(messageBody.identityId)
      activeSubs <- sfConnector.getActiveSubs(Seq(messageBody.identityId))

      hasMobileSub = mobileSubscriptionsResponse.subscriptions
        .filter(_.valid)
        .headOption
        .map(_ => "InAppPurchase")
      productTypes = activeSubs.records.map(_.Product__c) ++ hasMobileSub

      consentsBody <- buildProductSwitchConsents(
        previousProductType,
        messageBody.productType,
        productTypes.toSet,
        consentsCalculator,
      )

      res <- sendConsentsReq(messageBody.identityId, consentsBody)
    } yield res

    logErrors(updateResult)
    emitIdentityMetrics(updateResult)

    updateResult
  }

  def processCancelledSub(
      messageBody: MessageBody,
      sendConsentsReq: (String, String) => Either[SoftOptInError, Unit],
      getMobileSubscriptions: String => Either[SoftOptInError, MobileSubscriptions],
      consentsCalculator: ConsentsCalculator,
      sfConnector: SalesforceConnector,
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

    Metrics.put(event = "cancellations_to_process", 1)

    val updateResult = for {
      mobileSubscriptionsResponse <- getMobileSubscriptions(messageBody.identityId)
      activeSubs <- sfConnector.getActiveSubs(Seq(messageBody.identityId))

      hasMobileSub = mobileSubscriptionsResponse.subscriptions
        .filter(_.valid)
        .headOption
        .map(_ => "InAppPurchase")
      productTypes = activeSubs.records.map(_.Product__c) ++ hasMobileSub

      consents <- consentsCalculator.getCancellationConsents(
        messageBody.productType,
        productTypes.toSet,
      )
      _ <- sendCancellationConsents(messageBody.identityId, consents)
    } yield ()

    logErrors(updateResult)
    emitIdentityMetrics(updateResult)

    updateResult
  }

  def logErrors(updateResults: Either[SoftOptInError, Unit]): Unit = {
    updateResults.left.foreach(error => logger.warn(s"${error.getMessage}"))
  }

  def emitIdentityMetrics(updateResults: Either[SoftOptInError, Unit]): Unit = {
    updateResults match {
      case Left(_) => Metrics.put(event = "failed_consents_updates", 1)
      case Right(_) => Metrics.put(event = "successful_consents_updates", 1)
    }
  }
}

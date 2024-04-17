package com.gu.soft_opt_in_consent_setter

import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.gu.soft_opt_in_consent_setter.models._
import com.typesafe.scalalogging.LazyLogging
import io.circe.ParsingFailure
import io.circe.{Decoder, DecodingFailure}
import io.circe.generic.auto._
import io.circe.parser.{decode => circeDecode}
import io.circe.syntax._

import scala.jdk.CollectionConverters._
import scala.util.{Failure, Success}
object HandlerIAP extends LazyLogging with RequestHandler[SQSEvent, Unit] {

  val readyToProcessAcquisitionStatus = "Ready to process acquisition"
  val readyToProcessCancellationStatus = "Ready to process cancellation"
  val readyProcessSwitchStatus = "Ready to process switch"

  sealed trait EventType
  case object Acquisition extends EventType
  case object Cancellation extends EventType
  case object Switch extends EventType

  object EventType {
    implicit val eventTypeDecoder: Decoder[EventType] = Decoder.decodeString.emap {
      case "Acquisition" => Right(Acquisition)
      case "Cancellation" => Right(Cancellation)
      case "Switch" => Right(Switch)
      case unknown => Left(s"Invalid EventType: $unknown")
    }
  }

  case class MessageBody(
      subscriptionId: String,
      identityId: String,
      eventType: EventType,
      productName: String,
      previousProductName: Option[String],
  )

  private def handleError[T <: Exception](exception: T) = {
    Metrics.put(event = "failed_run")
    logger.error(s"${exception.getMessage}")
    throw exception
  }

  override def handleRequest(input: SQSEvent, context: Context): Unit = {
    logger.info("Handling request")

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
          case Right(result) =>
            logger.info(s"Decoded message body: $result")
            result
        },
      )

    val setup = for {
      config <- SoftOptInConfig()
      sfConnector <- SalesforceConnector(config.sfConfig, config.sfApiVersion)
      dynamoConnector <- DynamoConnector()

      identityConnector = new IdentityConnector(config.identityConfig)
      consentsCalculator = new ConsentsCalculator(config.consentsMapping)
      mpapiConnector = new MpapiConnector(config.mpapiConfig)
    } yield (sfConnector, identityConnector, consentsCalculator, mpapiConnector, dynamoConnector)

    val (sfConnector, identityConnector, consentsCalculator, mpapiConnector, dynamoConnector) = setup match {
      case Left(error) => handleError(error)
      case Right(x) =>
        logger.info("Setup successful")
        x
    }

    messages.foreach { message =>
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
          )
        case Switch =>
          Metrics.put(event = "product_switches_to_process", 1)

          processProductSwitchSub(
            message,
            identityConnector.sendConsentsReq,
            mpapiConnector.getMobileSubscriptions,
            consentsCalculator,
            sfConnector,
          )
      }

      emitIdentityMetric(result)

      result match {
        case Left(e) => handleError(e)
        case Right(_) =>
          dynamoConnector.updateLoggingTable(message.subscriptionId, message.identityId, message.eventType) match {
            case Success(_) =>
              logger.info("Logged soft opt-in setting to Dynamo")
            case Failure(exception) =>
              logger.error(s"Dynamo write failed for identityId: ${message.identityId}")
              logger.error(s"Exception: $exception")
              Metrics.put("failed_dynamo_update")
          }
      }
    }

    logger.info("Finished processing messages")
    Metrics.put(event = "successful_run")
  }

  def processAcquiredSub(
      message: MessageBody,
      sendConsentsReq: (String, String) => Either[SoftOptInError, Unit],
      consentsCalculator: ConsentsCalculator,
  ): Either[SoftOptInError, Unit] =
    for {
      consents <- consentsCalculator.getSoftOptInsByProduct(message.productName)
      consentsBody = consentsCalculator.buildConsentsBody(consents, state = true)
      _ <- {
        logger.info(
          s"(acquisition) Sending consents request for identityId ${message.identityId} with payload: $consentsBody",
        )
        sendConsentsReq(message.identityId, consentsBody)
      }
    } yield ()

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
  ): Either[SoftOptInError, Unit] =
    for {
      previousProductName <- messageBody.previousProductName.toRight(
        SoftOptInError("Missing data: Product switch event is missing previousProductName property"),
      )

      mobileSubscriptionsResponse <- getMobileSubscriptions(messageBody.identityId)
      activeSubs <- sfConnector.getActiveSubs(Seq(messageBody.identityId))

      hasMobileSub = mobileSubscriptionsResponse.subscriptions
        .filter(_.valid)
        .headOption
        .map(_ => "InAppPurchase")
      productNames = activeSubs.records.map(_.Product__c) ++ hasMobileSub

      consentsBody <- buildProductSwitchConsents(
        previousProductName,
        messageBody.productName,
        productNames.toSet,
        consentsCalculator,
      )

      res <- {
        logger.info(
          s"(product switch) Sending consents request for identityId ${messageBody.identityId} with payload: $consentsBody",
        )
        sendConsentsReq(messageBody.identityId, consentsBody)
      }
    } yield res

  def processCancelledSub(
      messageBody: MessageBody,
      sendConsentsReq: (String, String) => Either[SoftOptInError, Unit],
      getMobileSubscriptions: String => Either[SoftOptInError, MobileSubscriptions],
      consentsCalculator: ConsentsCalculator,
      sfConnector: SalesforceConnector,
  ): Either[SoftOptInError, Unit] = {
    def sendCancellationConsents(identityId: String, consents: Set[String]): Either[SoftOptInError, Unit] = {
      if (consents.nonEmpty) {
        for {
          _ <- {
            val consentsBody = consentsCalculator.buildConsentsBody(consents, state = false)
            logger.info(
              s"(cancellation) Sending consents request for identityId $identityId with payload: $consentsBody",
            )
            sendConsentsReq(identityId, consentsBody)
          }
        } yield ()
      } else {
        Right(())
      }
    }

    for {
      mobileSubscriptionsResponse <- getMobileSubscriptions(messageBody.identityId)
      activeSubs <- sfConnector.getActiveSubs(Seq(messageBody.identityId))

      hasMobileSub = mobileSubscriptionsResponse.subscriptions
        .filter(_.valid)
        .headOption
        .map(_ => "InAppPurchase")
      productNames = activeSubs.records.map(_.Product__c) ++ hasMobileSub

      consents <- consentsCalculator.getCancellationConsents(
        messageBody.productName,
        productNames.toSet,
      )
      consentWithoutSimilarProducts = consentsCalculator.removeSimilarGuardianProductFromSet(consents)
      _ <- sendCancellationConsents(messageBody.identityId, consentWithoutSimilarProducts)
    } yield ()
  }

  def emitIdentityMetric(updateResults: Either[SoftOptInError, Unit]): Unit = {
    updateResults match {
      case Left(_) => Metrics.put(event = "failed_consents_updates", 1)
      case Right(_) => Metrics.put(event = "successful_consents_updates", 1)
    }
  }
}

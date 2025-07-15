package com.gu.soft_opt_in_consent_setter

import cats.implicits._
import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.gu.soft_opt_in_consent_setter.HandlerIAP.{Acquisition, MessageBody, UserConsentsOverrides}
import com.gu.soft_opt_in_consent_setter.models._
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.semiauto._
import io.circe.parser.{decode => circeDecode}
import io.circe.{Decoder, ParsingFailure}

import scala.jdk.CollectionConverters._
import scala.util.{Failure, Success, Try}

object RunLocalManualTest extends App {
  // If you get an inaccessible method error running locally, make sure you run it on an older JRE (java 11)

  val data = MessageBody(
    "123-456-7898-123",
    "1234",
    Acquisition,
    "CONTRIBUTION",
    None,
    None,
    Some(UserConsentsOverrides(Some(false))),
  )

  IAPMessageProcessor.create(Some("CODE"), Some("v56.0")).processMessage(data)

}

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

  case class UserConsentsOverrides(
      similarGuardianProducts: Option[Boolean],
  )

  case class WireMessageBody(
      subscriptionId: String,
      identityId: Option[String],
      eventType: EventType,
      productName: String,
      printProduct: Option[String],
      previousProductName: Option[String],
      userConsentsOverrides: Option[UserConsentsOverrides],
  )
  object WireMessageBody {
    implicit val decoderUserConsentsOverrides: Decoder[UserConsentsOverrides] = deriveDecoder[UserConsentsOverrides]
    implicit val decoder: Decoder[WireMessageBody] = deriveDecoder[WireMessageBody]
  }

  case class MessageBody(
      subscriptionId: String,
      identityId: String,
      eventType: EventType,
      productName: String,
      printProduct: Option[String],
      previousProductName: Option[String],
      userConsentsOverrides: Option[UserConsentsOverrides],
  )
  object MessageBody {

    def parseWireMessageBody(wireMessageBody: WireMessageBody): Try[Option[MessageBody]] =
      wireMessageBody.identityId match {
        case Some(identityId) =>
          val messageBody = fromIdentityIdOverride(wireMessageBody, identityId)
          logger.info(s"Decoded message body: $messageBody")
          Success(Some(messageBody))
        case None if wireMessageBody.productName == "CONTRIBUTION" =>
          // payment api processes contributions from guests before creating identity account
          // if creation fails, it's written to the acquisition bus without identityId
          // it's tricky to filter messages in CDK so they are filtered here
          // We skip it as there's no such thing as consents if there's no identity id.
          logger.info("identity id was undefined, skipping message")
          Success(None)
        case None =>
          logger.info("identity id was undefined, returning failure")
          Failure(SoftOptInError("identityId is required to set consents"))
      }

    private def fromIdentityIdOverride(wireMessageBody: WireMessageBody, identityIdOverride: String): MessageBody =
      MessageBody(
        wireMessageBody.subscriptionId,
        identityIdOverride,
        wireMessageBody.eventType,
        wireMessageBody.productName,
        wireMessageBody.printProduct,
        wireMessageBody.previousProductName,
        wireMessageBody.userConsentsOverrides,
      )

  }

  def rethrowError(throwable: Throwable): Nothing = {
    Metrics.put(event = "failed_run")
    logger.error(s"${throwable.getMessage}")
    throw throwable
  }

  override def handleRequest(input: SQSEvent, context: Context): Unit = {
    logger.info("Handling request")

    val messages: List[MessageBody] = parseMessages(input.getRecords.asScala.toList.map(_.getBody))
      .collect {
        case Failure(exception) => rethrowError(exception)
        case Success(value) => value
      }

    val messageProcessor = IAPMessageProcessor.create(sys.env.get("Stage"), sys.env.get("sfApiVersion"))

    messages.foreach(messageProcessor.processMessage)

    logger.info("Finished processing messages")
    Metrics.put(event = "successful_run")
  }

  def parseMessages(inputRecords: List[String]): List[Try[MessageBody]] =
    for {
      body <- inputRecords
      _ = logger.info(s"Raw SQS body:\n$body")
      failableMaybeMessageBody = for {
        wireMessageBody <- circeDecode[WireMessageBody](body).left.map(wrapParserError(_, body)).toTry
        maybeMessageBody <- MessageBody.parseWireMessageBody(wireMessageBody)
      } yield maybeMessageBody
      failableMessageBody <- failableMaybeMessageBody.sequence // sequence does Try[Option[A]] => Option[Try[A]]
    } yield failableMessageBody

  private def wrapParserError(exception: Exception, body: String) =
    exception match {
      case pf: ParsingFailure =>
        SoftOptInError(
          s"Error '${pf.message}' when decoding JSON to MessageBody with cause :${pf.getCause} with body: $body",
          pf,
        )
      case ex =>
        SoftOptInError(s"Unknown error when decoding JSON to MessageBody with body: $body", ex)
    }

}

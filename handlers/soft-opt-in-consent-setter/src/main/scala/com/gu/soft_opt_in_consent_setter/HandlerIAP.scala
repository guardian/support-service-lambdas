package com.gu.soft_opt_in_consent_setter

import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.amazonaws.services.lambda.runtime.{Context, RequestHandler}
import com.gu.soft_opt_in_consent_setter.HandlerIAP.{Acquisition, MessageBody, UserConsentsOverrides}
import com.gu.soft_opt_in_consent_setter.models._
import com.typesafe.scalalogging.LazyLogging
import io.circe.{Decoder, ParsingFailure}
import io.circe.generic.semiauto._
import io.circe.parser.{decode => circeDecode}

import scala.jdk.CollectionConverters._

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
    implicit val decoder: Decoder[Option[MessageBody]] =
      WireMessageBody.decoder.map { wireMessageBody =>
        wireMessageBody.identityId.map { identityId =>
          import wireMessageBody.{identityId => _, _}
          MessageBody(
            subscriptionId,
            identityId,
            eventType,
            productName,
            printProduct,
            previousProductName,
            userConsentsOverrides,
          )
        }
      }
  }

  def handleError[T <: Exception](exception: T) = {
    Metrics.put(event = "failed_run")
    logger.error(s"${exception.getMessage}")
    throw exception
  }

  override def handleRequest(input: SQSEvent, context: Context): Unit = {
    logger.info("Handling request")

    val messages: List[MessageBody] = parseMessages(input.getRecords.asScala.toList.map(_.getBody))

    val messageProcessor = IAPMessageProcessor.create(sys.env.get("Stage"), sys.env.get("sfApiVersion"))

    messages.foreach(messageProcessor.processMessage)

    logger.info("Finished processing messages")
    Metrics.put(event = "successful_run")
  }

  def parseMessages(inputRecords: List[String]): List[MessageBody] =
    for {
      body <- inputRecords
      result <- circeDecode[Option[MessageBody]](body) match {
        case Left(pf: ParsingFailure) =>
          val exception = SoftOptInError(
            s"Error '${pf.message}' when decoding JSON to MessageBody with cause :${pf.getCause} with body: $body",
            pf,
          )
          handleError(exception)
        case Left(ex) =>
          val exception =
            SoftOptInError(s"Unknown error when decoding JSON to MessageBody with body: $body", ex)
          handleError(exception)
        case Right(maybeResult) =>
          logger.info(maybeResult match {
            case Some(identityId) => s"Decoded message body: $identityId"
            case None => "identity id was undefined, skipping message"
          })
          maybeResult
      }
    } yield result
}

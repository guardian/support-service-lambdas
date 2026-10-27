package com.gu.autoCancel

import com.gu.effects.aws
import com.gu.util.Logging
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, ClientSuccess, GenericError}
import com.gu.util.zuora.SubscriptionNumber
import play.api.libs.json.Json
import software.amazon.awssdk.regions.Region.EU_WEST_1
import software.amazon.awssdk.services.eventbridge.EventBridgeClient
import software.amazon.awssdk.services.eventbridge.model.{PutEventsRequest, PutEventsRequestEntry, PutEventsResponse}

import scala.jdk.CollectionConverters._
import scala.util.Try

trait CancellationEventPublisher {
  def publish(
      subscription: SubscriptionNumber,
      orderNumber: Option[String],
      calloutInvoiceId: String,
  ): ClientFailableOp[Unit]
}

object CancellationEventPublisher {
  def apply(stage: String): CancellationEventPublisher = {
    val client = EventBridgeClient.builder
      .credentialsProvider(aws.CredentialsProvider)
      .region(EU_WEST_1)
      .build()
    new EventBridgeCancellationEventPublisher(stage, request => client.putEvents(request))
  }
}

class EventBridgeCancellationEventPublisher(
    stage: String,
    putEvents: PutEventsRequest => PutEventsResponse,
) extends CancellationEventPublisher
    with Logging {

  override def publish(
      subscription: SubscriptionNumber,
      orderNumber: Option[String],
      calloutInvoiceId: String,
  ): ClientFailableOp[Unit] = {
    val context =
      s"stage=$stage subscription=${subscription.value} orderNumber=$orderNumber calloutInvoiceId=$calloutInvoiceId"
    val result = for {
      number <- orderNumber match {
        case Some(value) if value.matches("[A-Za-z0-9-]+") => ClientSuccess(value)
        case _ => GenericError(s"Missing or invalid cancellation order number: $context")
      }
      _ <-
        if (subscription.value.matches("[A-Za-z0-9-]+")) ClientSuccess(())
        else GenericError(s"Invalid subscription number: $context")
      detail = Json.stringify(
        Json.obj(
          "subscriptionNumber" -> subscription.value,
          "orderNumber" -> number,
          "allowUserNotifications" -> true,
        ),
      )
      entry = PutEventsRequestEntry.builder
        .eventBusName(s"cancellations-bus-$stage")
        .source(s"lambda:zuora-auto-cancel-$stage")
        .detailType("Cancellation")
        .detail(detail)
        .build()
      _ = logger.info(s"Publishing cancellation event: $context detail=$detail")
      response <- Try(putEvents(PutEventsRequest.builder.entries(entry).build())).fold(
        error => {
          logger.error(s"EventBridge request failed: $context", error)
          GenericError(s"EventBridge request failed: ${error.getMessage}")
        },
        ClientSuccess(_),
      )
      _ = logger.info(s"EventBridge response: $context response=$response")
      _ <- {
        val entries = response.entries().asScala.toList
        if (
          response.failedEntryCount() == Integer.valueOf(0) &&
          entries.size == 1 &&
          Option(entries.head.errorCode()).isEmpty &&
          Option(entries.head.errorMessage()).isEmpty &&
          Option(entries.head.eventId()).exists(_.trim.nonEmpty)
        ) ClientSuccess(())
        else GenericError(s"EventBridge rejected cancellation event: $response")
      }
    } yield ()

    result match {
      case failure: ClientFailure => logger.error(s"CancellationEventPublishFailed: $context failure=$failure")
      case ClientSuccess(_) => logger.info(s"Cancellation event published: $context")
    }
    result
  }
}

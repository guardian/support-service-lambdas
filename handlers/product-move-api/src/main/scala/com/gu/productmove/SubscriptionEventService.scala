package com.gu.productmove

import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.zuora.model.{OrderNumber, SubscriptionName}
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.eventbridge.EventBridgeClient
import software.amazon.awssdk.services.eventbridge.model.{PutEventsRequest, PutEventsRequestEntry}
import zio.json.*
import zio.{RIO, RLayer, Task, ZIO, ZLayer}

import scala.jdk.CollectionConverters.*
import scala.util.Try

/** Publishes events onto the `subscription-events-STAGE` EventBridge bus (see `modules/subscription-events/README.md`
  * in the main TS codebase for the full JSON shape and consumer-side docs - there's no shared schema across languages,
  * so this is a hand-written case class kept in step with that shape by hand).
  */
trait SubscriptionEventService {
  def publishCancellationEvent(
      subscriptionNumber: SubscriptionName,
      orderNumber: OrderNumber,
      allowUserNotifications: Boolean,
  ): Task[Unit]
}

object SubscriptionEventService {
  def publishCancellationEvent(
      subscriptionNumber: SubscriptionName,
      orderNumber: OrderNumber,
      allowUserNotifications: Boolean,
  ): RIO[SubscriptionEventService, Unit] =
    ZIO.environmentWithZIO(
      _.get.publishCancellationEvent(subscriptionNumber, orderNumber, allowUserNotifications),
    )
}

case class CancellationDetail(
    subscriptionNumber: String,
    orderNumber: String,
    allowUserNotifications: Boolean,
) derives JsonEncoder

class SubscriptionEventServiceLive(
    eventBridgeClient: EventBridgeClient,
    busName: String,
    source: String,
) extends SubscriptionEventService {

  override def publishCancellationEvent(
      subscriptionNumber: SubscriptionName,
      orderNumber: OrderNumber,
      allowUserNotifications: Boolean,
  ): Task[Unit] = {
    val detail = CancellationDetail(subscriptionNumber.value, orderNumber.value, allowUserNotifications)
    val entry = PutEventsRequestEntry.builder
      .eventBusName(busName)
      .source(source)
      .detailType("Cancellation")
      .detail(detail.toJson)
      .build()

    for {
      _ <- ZIO.log(s"Publishing Cancellation subscription-event for ${subscriptionNumber.value}: ${detail.toJson}")
      _ <- ZIO
        .attemptBlocking(putSingleEvent(entry))
        .mapError { ex =>
          new Throwable(
            s"Failed to publish Cancellation subscription-event for subscription Number: ${subscriptionNumber.value} with error: ${ex.toString}",
            ex,
          )
        }
      _ <- ZIO.log(s"Successfully published Cancellation subscription-event for ${subscriptionNumber.value}")
    } yield ()
  }

  private def putSingleEvent(entry: PutEventsRequestEntry): Unit = {
    val response = eventBridgeClient.putEvents(PutEventsRequest.builder.entries(entry).build())
    if (response.failedEntryCount() > 0) {
      val errorMessages = response.entries().asScala.flatMap(e => Option(e.errorMessage())).mkString("; ")
      throw new Throwable(errorMessages)
    }
  }
}

object SubscriptionEventServiceLive {
  val layer: RLayer[AwsCredentialsProvider & Stage, SubscriptionEventService] =
    ZLayer.scoped(for {
      stage <- ZIO.service[Stage]
      creds <- ZIO.service[AwsCredentialsProvider]
      service <- ZIO.fromTry(impl(stage, creds))
    } yield service)

  def impl(stage: Stage, creds: AwsCredentialsProvider): Try[SubscriptionEventServiceLive] =
    Try(
      EventBridgeClient.builder
        .region(Region.EU_WEST_1)
        .credentialsProvider(creds)
        .build(),
    ).map { client =>
      new SubscriptionEventServiceLive(
        client,
        busName = s"subscription-events-$stage",
        source = "lambda:move-product",
      )
    }
}

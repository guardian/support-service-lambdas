package com.gu.effects.eventbridge

import com.typesafe.scalalogging.LazyLogging
import software.amazon.awssdk.regions.Region.EU_WEST_1
import software.amazon.awssdk.services.eventbridge.EventBridgeClient
import software.amazon.awssdk.services.eventbridge.model.{PutEventsRequestEntry, PutEventsRequest}
import scala.jdk.CollectionConverters._

object AwsEventBridge extends LazyLogging {
  def buildClient: EventBridgeClient = EventBridgeClient.builder
    .region(EU_WEST_1)
    .credentialsProvider(CredentialsProvider)
    .build()

  def putEvents(
      client: EventBridgeClient,
  )(
      eventBusName: EventBusName,
      eventSource: EventSource,
      detailType: DetailType,
      events: List[EventDetail],
  ): Either[List[PutEventError], Unit] = {

    val requestEntries = events.map(payload => buildEvent(eventBusName, eventSource, detailType, payload)).asJava
    val eventsRequest = PutEventsRequest.builder.entries(requestEntries).build
    val result = client.putEvents(eventsRequest)

    if (result.failedEntryCount > 0)
      Left(
        result.entries.asScala.toList
          .filter(_.eventId == null)
          .map(entry => PutEventError(entry.errorCode, entry.errorMessage)),
      )
    else
      Right(())
  }

  private def buildEvent(
      eventBusName: EventBusName,
      eventSource: EventSource,
      detailType: DetailType,
      payload: EventDetail,
  ) = {
    PutEventsRequestEntry.builder
      .source(eventSource.value)
      .detailType(detailType.value)
      .detail(payload.value)
      .eventBusName(eventBusName.value)
      .build
  }

  case class EventBusName(value: String) extends AnyVal

  /** This is the source element used by EventBridge to match to the correct rule See:
    * https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_PutEvents.html and
    * https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule.html
    */
  case class EventSource(value: String) extends AnyVal

  /** This is the type of the EventDetail json payload. See:
    * https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-events-structure.html
    */
  case class DetailType(value: String) extends AnyVal

  /** The json event payload passed into the detail element of the EventBridge object, See:
    * https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-events-structure.html
    */
  case class EventDetail(value: String) extends AnyVal

  case class PutEventError(errorCode: String, message: String)
}

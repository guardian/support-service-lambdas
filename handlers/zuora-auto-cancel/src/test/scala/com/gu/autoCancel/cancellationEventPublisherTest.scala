package com.gu.autoCancel

import com.gu.util.resthttp.Types.ClientSuccess
import com.gu.util.zuora.SubscriptionNumber
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.Json
import software.amazon.awssdk.services.eventbridge.model.{PutEventsRequest, PutEventsResponse, PutEventsResultEntry}

import scala.collection.mutable.ListBuffer
import scala.io.Source
import scala.util.Using

class CancellationEventPublisherTest extends AnyFlatSpec with Matchers with EitherValues {
  private val subscription = SubscriptionNumber("A-S00001234")
  private val orderNumber = Some("O-00005678")
  private val successEntry = PutEventsResultEntry.builder.eventId("event-1").build()
  private val success = PutEventsResponse.builder.failedEntryCount(0).entries(successEntry).build()

  List("CODE", "PROD").foreach { stage =>
    "CancellationEventPublisher" should s"publish the exact cancellation contract to the $stage bus" in {
      val requests = ListBuffer.empty[PutEventsRequest]
      val publisher = new EventBridgeCancellationEventPublisher(
        stage,
        request => {
          requests += request
          success
        },
      )

      publisher.publish(subscription, orderNumber, "callout-invoice") shouldBe ClientSuccess(())

      requests should have size 1
      val entries = requests.head.entries()
      entries should have size 1
      val entry = entries.get(0)
      entry.eventBusName() shouldBe s"cancellations-bus-$stage"
      entry.source() shouldBe s"lambda:zuora-auto-cancel-$stage"
      entry.detailType() shouldBe "Cancellation"
      val fixture = Using.resource(Source.fromResource("cancellationEvent.json"))(_.mkString)
      Json.parse(entry.detail()) shouldBe Json.parse(fixture)
    }
  }

  List(
    "entry rejection" -> PutEventsResponse.builder
      .failedEntryCount(1)
      .entries(PutEventsResultEntry.builder.errorCode("InternalFailure").errorMessage("Try again").build())
      .build(),
    "missing entry" -> PutEventsResponse.builder.failedEntryCount(0).build(),
    "extra entries" -> PutEventsResponse.builder.failedEntryCount(0).entries(successEntry, successEntry).build(),
    "missing failure count" -> PutEventsResponse.builder.entries(successEntry).build(),
    "missing event ID" -> PutEventsResponse.builder
      .failedEntryCount(0)
      .entries(PutEventsResultEntry.builder.build())
      .build(),
    "blank event ID" -> PutEventsResponse.builder
      .failedEntryCount(0)
      .entries(PutEventsResultEntry.builder.eventId(" ").build())
      .build(),
    "entry error with zero failed count" -> PutEventsResponse.builder
      .failedEntryCount(0)
      .entries(PutEventsResultEntry.builder.eventId("event-1").errorCode("InternalFailure").build())
      .build(),
  ).foreach { case (description, response) =>
    it should s"reject $description instead of reporting publication success" in {
      val publisher = new EventBridgeCancellationEventPublisher("CODE", _ => response)

      publisher.publish(subscription, orderNumber, "callout-invoice").toDisjunction.left.value.message should
        include("EventBridge rejected cancellation event")
    }
  }

  it should "surface SDK exceptions without retrying within the invocation" in {
    var attempts = 0
    val publisher = new EventBridgeCancellationEventPublisher(
      "CODE",
      _ => {
        attempts += 1
        throw new RuntimeException("EventBridge unavailable")
      },
    )

    publisher.publish(subscription, orderNumber, "callout-invoice").toDisjunction.left.value.message should
      include("EventBridge unavailable")
    attempts shouldBe 1
  }

  List(None, Some(""), Some(" "), Some("O-123/invalid")).foreach { number =>
    it should s"reject invalid order number $number without calling EventBridge" in {
      val publisher = new EventBridgeCancellationEventPublisher("CODE", _ => fail("Unexpected publication"))

      publisher.publish(subscription, number, "callout-invoice").isFailure shouldBe true
    }
  }

  it should "reject an invalid subscription number without calling EventBridge" in {
    val publisher = new EventBridgeCancellationEventPublisher("CODE", _ => fail("Unexpected publication"))

    publisher.publish(SubscriptionNumber("A S123"), orderNumber, "callout-invoice").isFailure shouldBe true
  }
}

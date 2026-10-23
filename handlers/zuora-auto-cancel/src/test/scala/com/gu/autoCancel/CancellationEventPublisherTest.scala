package com.gu.autoCancel

import com.gu.util.config.Stage
import com.gu.util.resthttp.Types.ClientSuccess
import com.gu.util.zuora.{OrderNumber, SubscriptionNumber}
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
  private val orderNumber = OrderNumber("O-00005678")
  private val successEntry = PutEventsResultEntry.builder.eventId("event-1").build()
  private val success = PutEventsResponse.builder.failedEntryCount(0).entries(successEntry).build()

  List("CODE", "PROD").foreach { stage =>
    "CancellationEventPublisher" should s"publish the exact cancellation contract to the $stage bus" in {
      val requests = ListBuffer.empty[PutEventsRequest]
      val publisher = new EventBridgeCancellationEventPublisher(
        Stage(stage),
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
      val publisher = new EventBridgeCancellationEventPublisher(Stage("CODE"), _ => response)

      publisher.publish(subscription, orderNumber, "callout-invoice").toDisjunction.left.value.message should
        include("EventBridge rejected cancellation event")
    }
  }

  it should "surface SDK exceptions without retrying within the invocation" in {
    var attempts = 0
    val publisher = new EventBridgeCancellationEventPublisher(
      Stage("CODE"),
      _ => {
        attempts += 1
        throw new RuntimeException("EventBridge unavailable")
      },
    )

    publisher.publish(subscription, orderNumber, "callout-invoice").toDisjunction.left.value.message should
      include("EventBridge unavailable")
    attempts shouldBe 1
  }

  it should "attempt later events after an earlier event fails and preserve the subscription/order pairing" in {
    val cancellations = List(
      AutoCancel.CancelledSubscription(
        AutoCancel.AutoCancelRequest("account", subscription, java.time.LocalDate.of(2026, 10, 20)),
        AutoCancel.CancellationResponse("invoice-1", orderNumber),
      ),
      AutoCancel.CancelledSubscription(
        AutoCancel
          .AutoCancelRequest("account", SubscriptionNumber("A-S00002345"), java.time.LocalDate.of(2026, 10, 20)),
        AutoCancel.CancellationResponse("invoice-2", OrderNumber("O-00006789")),
      ),
    )
    val requests = ListBuffer.empty[PutEventsRequest]
    val publisher: CancellationEventPublisher = new EventBridgeCancellationEventPublisher(
      Stage("CODE"),
      request => {
        requests += request
        if (requests.size == 1) throw new RuntimeException("First event failed")
        success
      },
    )

    publisher.publish(cancellations, "callout-invoice").toDisjunction.left.value.message should include(
      "First event failed",
    )

    requests.map(request => Json.parse(request.entries().get(0).detail())).toList shouldBe List(
      Json.obj(
        "subscriptionNumber" -> subscription.value,
        "orderNumber" -> orderNumber.value,
        "allowUserNotifications" -> true,
      ),
      Json.obj(
        "subscriptionNumber" -> "A-S00002345",
        "orderNumber" -> "O-00006789",
        "allowUserNotifications" -> true,
      ),
    )
  }

}

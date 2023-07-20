package com.gu.effects.sqs

import com.gu.effects.eventbridge.AwsEventBridge
import com.gu.effects.eventbridge.AwsEventBridge.{EventBusName, EventSource, DetailType, EventDetail}
import com.gu.test.EffectsTest
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class AWSEventSendTest extends AnyFlatSpec with Matchers {

  it should "be able to send an event" taggedAs EffectsTest in {
    for {
      _ <- AwsEventBridge.putEvents(AwsEventBridge.buildClient)(
        EventBusName("test-support-service-effects-tests"),
        EventSource("test-source"),
        DetailType("test-detail-type"),
        List(EventDetail("{}")),
      )
    } yield {
      succeed
    }
  }
}

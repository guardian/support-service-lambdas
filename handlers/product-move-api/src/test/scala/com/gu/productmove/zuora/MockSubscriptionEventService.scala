package com.gu.productmove.zuora

import com.gu.productmove.SubscriptionEventService
import com.gu.productmove.zuora.model.{OrderNumber, SubscriptionName}
import zio.*

import scala.collection.mutable.ArrayBuffer

case class CancellationEventRequest(
    subscriptionNumber: SubscriptionName,
    orderNumber: OrderNumber,
    allowUserNotifications: Boolean,
)

class MockSubscriptionEventService(shouldFail: Boolean = false) extends SubscriptionEventService {
  val requests: ArrayBuffer[CancellationEventRequest] = ArrayBuffer.empty // we need to remember the side effects

  override def publishCancellationEvent(
      subscriptionNumber: SubscriptionName,
      orderNumber: OrderNumber,
      allowUserNotifications: Boolean,
  ): Task[Unit] = {
    requests += CancellationEventRequest(subscriptionNumber, orderNumber, allowUserNotifications)

    if (shouldFail)
      ZIO.fail(new Throwable("MockSubscriptionEventService: stubbed failure"))
    else
      ZIO.unit
  }
}

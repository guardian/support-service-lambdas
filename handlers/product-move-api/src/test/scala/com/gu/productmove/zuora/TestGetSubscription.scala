package com.gu.productmove.zuora

import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import zio.{IO, ZIO}

class TestGetSubscription(responses: Map[String, String]) extends GetSubscription {

  private var mutableStore: List[String] = Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def get(subscriptionNumber: String): IO[String, GetSubscription.GetSubscriptionResponse] = {
    mutableStore = subscriptionNumber :: mutableStore
    responses.get(subscriptionNumber) match
      case Some(value) => ZIO.succeed(GetSubscriptionResponse(value, "accountId"))
      case None => ZIO.fail(s"success = false, subscription not found: $subscriptionNumber")
  }

}

object TestGetSubscription {
  def requests: ZIO[TestGetSubscription, Nothing, List[String]] = ZIO.serviceWith[TestGetSubscription](_.requests)
}

package com.gu.productmove.salesforce

import com.gu.productmove.salesforce.GetSfSubscription.GetSfSubscriptionResponse
import zio.{IO, ZIO}

class MockGetSfSubscription(responses: Map[String, GetSfSubscriptionResponse]) extends GetSfSubscription {

  private var mutableStore: List[String] = Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def get(subscriptionName: String): ZIO[Any, String, GetSfSubscriptionResponse] = {
    mutableStore = subscriptionName :: mutableStore

    responses.get(subscriptionName) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(s"Salesforce error message")
  }
}

object MockGetSfSubscription {
  def requests: ZIO[MockGetSfSubscription, Nothing, List[String]] = ZIO.serviceWith[MockGetSfSubscription](_.requests)
}

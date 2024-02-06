package com.gu.productmove.salesforce

import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
import com.gu.productmove.salesforce.GetSfSubscription.GetSfSubscriptionResponse
import zio.*

class MockGetSfSubscription(responses: Map[String, GetSfSubscriptionResponse]) extends GetSfSubscription {

  private var mutableStore: List[String] = Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def get(subscriptionName: String): Task[GetSfSubscriptionResponse] = {
    mutableStore = subscriptionName :: mutableStore

    responses.get(subscriptionName) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(new Throwable(s"Salesforce error message"))
  }
}

object MockGetSfSubscription {
  def requests: ZIO[MockGetSfSubscription, Nothing, List[String]] = ZIO.serviceWith[MockGetSfSubscription](_.requests)
}

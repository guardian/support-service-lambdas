package com.gu.productmove.zuora

import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.CreateSubscriptionResponse
import zio.*

class MockSubscribe(responses: Map[(String, String), CreateSubscriptionResponse]) extends Subscribe {

  private var mutableStore: List[(String, String)] = Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def create(
      zuoraAccountId: String,
      targetProductId: String,
  ): Task[CreateSubscriptionResponse] = {
    val params = (zuoraAccountId, targetProductId)
    mutableStore = params :: mutableStore

    responses.get(params) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(new Throwable(s"mock: success = false subscribe: " + params))
  }
}

object MockSubscribe {
  def requests: ZIO[MockSubscribe, Nothing, List[(String, String)]] = ZIO.serviceWith[MockSubscribe](_.requests)
}

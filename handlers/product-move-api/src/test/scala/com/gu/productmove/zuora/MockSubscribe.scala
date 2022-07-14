package com.gu.productmove.zuora

import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.CreateSubscriptionResponse
import zio.{IO, ZIO}

class MockSubscribe(responses: Map[(String, String), CreateSubscriptionResponse]) extends Subscribe {

  private var mutableStore: List[(String, String)] = Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def create(zuoraAccountId: String, targetProductId: String): ZIO[Any, String, CreateSubscriptionResponse] = {
    mutableStore = (zuoraAccountId, targetProductId) :: mutableStore

    responses.get((zuoraAccountId, targetProductId)) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(s"success = false")
  }
}

object MockSubscribe {
  def requests: ZIO[MockSubscribe, Nothing, List[(String, String)]] = ZIO.serviceWith[MockSubscribe](_.requests)
}

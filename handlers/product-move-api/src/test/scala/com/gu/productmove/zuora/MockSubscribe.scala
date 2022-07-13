package com.gu.productmove.zuora

import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.Subscribe.CreateSubscriptionResponse
import zio.{IO, ZIO}

class MockSubscribe(responses: Map[String, String]) extends Subscribe {

  private var mutableStore: List[String] = Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def create(body: String): ZIO[Any, String, CreateSubscriptionResponse] = {
    mutableStore = body :: mutableStore
    ZIO.succeed(CreateSubscriptionResponse("new subscription ID"))
  }

  override def createRequestBody(zuoraAccountId: String, targetProductId: String): ZIO[Any, Nothing, String] = ???
}

object MockSubscribe {
  def requests: ZIO[MockSubscribe, Nothing, List[String]] = ZIO.serviceWith[MockSubscribe](_.requests)
}

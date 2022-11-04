package com.gu.productmove.zuora

import com.gu.newproduct.api.productcatalog.BillingPeriod
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.CreateSubscriptionResponse
import zio.{IO, ZIO}

class MockSubscriptionUpdate(responses: Map[(String, BillingPeriod, Double, String), SubscriptionUpdateResponse]) extends SubscriptionUpdate {

  private var mutableStore: List[(String, BillingPeriod, Double, String)] = Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def update(subscriptionId: String, billingPeriod: BillingPeriod, price: Double, ratePlanIdToRemove: String): ZIO[Any, String, SubscriptionUpdateResponse] = {
    mutableStore = (subscriptionId, billingPeriod, price, ratePlanIdToRemove) :: mutableStore

    responses.get(subscriptionId, billingPeriod, price, ratePlanIdToRemove) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(s"success = false")
  }
}

object MockSubscriptionUpdate {
  def requests: ZIO[MockSubscriptionUpdate, Nothing, List[(String, BillingPeriod, Double, String)]] = ZIO.serviceWith[MockSubscriptionUpdate](_.requests)
}

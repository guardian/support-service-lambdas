package com.gu.productmove.zuora

import com.gu.newproduct.api.productcatalog.BillingPeriod
import com.gu.productmove.GuStageLive
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.PreviewResult
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.CreateSubscriptionResponse
import zio.{IO, ZIO}

class MockSubscriptionUpdate(responses: Map[(String, BillingPeriod, BigDecimal, String), SubscriptionUpdateResponse])
    extends SubscriptionUpdate {

  private var mutableStore: List[(String, BillingPeriod, BigDecimal, String)] = Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def update(
      subscriptionId: String,
      billingPeriod: BillingPeriod,
      price: BigDecimal,
      ratePlanIdToRemove: String,
  ): ZIO[Any, String, SubscriptionUpdateResponse] = {
    mutableStore = (subscriptionId, billingPeriod, price, ratePlanIdToRemove) :: mutableStore

    responses.get(subscriptionId, billingPeriod, price, ratePlanIdToRemove) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(s"success = false")
  }

  override def preview(subscriptionId: String, billingPeriod: BillingPeriod, price: BigDecimal, ratePlanIdToRemove: String): ZIO[GuStageLive.Stage, String, PreviewResult] = {
    val previewResult = PreviewResult(10, -10, 20)
    ZIO.succeed(previewResult) //TODO: test this for real
  }

}

object MockSubscriptionUpdate {
  def requests: ZIO[MockSubscriptionUpdate, Nothing, List[(String, BillingPeriod, BigDecimal, String)]] =
    ZIO.serviceWith[MockSubscriptionUpdate](_.requests)
}

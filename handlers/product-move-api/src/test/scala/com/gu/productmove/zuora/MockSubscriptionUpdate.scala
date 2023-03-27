package com.gu.productmove.zuora

import com.gu.newproduct.api.productcatalog.BillingPeriod
import com.gu.productmove.GuStageLive
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.PreviewResult
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.CreateSubscriptionResponse
import zio.{IO, ZIO}
import com.gu.i18n.Currency

class MockSubscriptionUpdate(
    previewResponse: Map[(String, BillingPeriod, BigDecimal, String), PreviewResult],
    updateResponse: Map[(String, BillingPeriod, BigDecimal, String), SubscriptionUpdateResponse],
) extends SubscriptionUpdate {

  private var mutableStore: List[(String, BillingPeriod, BigDecimal, String)] =
    Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def update(
      subscriptionId: String,
      billingPeriod: BillingPeriod,
      price: BigDecimal,
      currency: Currency,
      ratePlanIdToRemove: String,
  ): ZIO[Any, String, SubscriptionUpdateResponse] = {
    mutableStore = (subscriptionId, billingPeriod, price, ratePlanIdToRemove) :: mutableStore

    updateResponse.get(subscriptionId, billingPeriod, price, ratePlanIdToRemove) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(s"success = false")
  }

  override def preview(
      subscriptionId: String,
      billingPeriod: BillingPeriod,
      price: BigDecimal,
      currency: Currency,
      ratePlanIdToRemove: String,
  ): ZIO[GuStageLive.Stage, String, PreviewResult] = {
    mutableStore = (subscriptionId, billingPeriod, price, ratePlanIdToRemove) :: mutableStore

    previewResponse.get(subscriptionId, billingPeriod, price, ratePlanIdToRemove) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(s"success = false")
  }

}

object MockSubscriptionUpdate {
  def requests: ZIO[MockSubscriptionUpdate, Nothing, List[(String, BillingPeriod, BigDecimal, String)]] =
    ZIO.serviceWith[MockSubscriptionUpdate](_.requests)
}

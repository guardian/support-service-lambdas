package com.gu.productmove.zuora

import com.gu.newproduct.api.productcatalog.BillingPeriod
import com.gu.productmove.GuStageLive
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.PreviewResult
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.CreateSubscriptionResponse
import com.gu.productmove.zuora.model.SubscriptionName
import zio.{IO, ZIO}
import com.gu.i18n.Currency

class MockSubscriptionUpdate(
    previewResponse: Map[(SubscriptionName, BillingPeriod, BigDecimal, String), PreviewResult],
    updateResponse: Map[(SubscriptionName, BillingPeriod, BigDecimal, String), SubscriptionUpdateResponse],
) extends SubscriptionUpdate {

  private var mutableStore: List[(SubscriptionName, BillingPeriod, BigDecimal, String)] =
    Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def update(
      subscriptionName: SubscriptionName,
      billingPeriod: BillingPeriod,
      price: BigDecimal,
      currency: Currency,
      ratePlanIdToRemove: String,
  ): ZIO[Any, String, SubscriptionUpdateResponse] = {
    mutableStore = (subscriptionName, billingPeriod, price, ratePlanIdToRemove) :: mutableStore

    updateResponse.get(subscriptionName, billingPeriod, price, ratePlanIdToRemove) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(s"success = false")
  }

  override def preview(
      subscriptionName: SubscriptionName,
      billingPeriod: BillingPeriod,
      price: BigDecimal,
      currency: Currency,
      ratePlanIdToRemove: String,
  ): ZIO[GuStageLive.Stage, String, PreviewResult] = {
    mutableStore = (subscriptionName, billingPeriod, price, ratePlanIdToRemove) :: mutableStore

    previewResponse.get(subscriptionName, billingPeriod, price, ratePlanIdToRemove) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(s"success = false")
  }

}

object MockSubscriptionUpdate {
  def requests: ZIO[MockSubscriptionUpdate, Nothing, List[(SubscriptionName, BillingPeriod, BigDecimal, String)]] =
    ZIO.serviceWith[MockSubscriptionUpdate](_.requests)
}

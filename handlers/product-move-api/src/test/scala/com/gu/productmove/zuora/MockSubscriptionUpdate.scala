package com.gu.productmove.zuora

import com.gu.newproduct.api.productcatalog.BillingPeriod
import com.gu.productmove.GuStageLive
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.CreateSubscriptionResponse
import zio.{IO, ZIO}

class MockSubscriptionUpdate(responses: Map[(String, BillingPeriod, Double, String), SubscriptionUpdateResponse])
    extends SubscriptionUpdate {

  private var mutableStore: List[(String, BillingPeriod, Double, String)] = Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def update(
      subscriptionId: String,
      billingPeriod: BillingPeriod,
      price: Double,
      ratePlanIdToRemove: String,
  ): ZIO[Any, String, SubscriptionUpdateResponse] = {
    mutableStore = (subscriptionId, billingPeriod, price, ratePlanIdToRemove) :: mutableStore

    responses.get(subscriptionId, billingPeriod, price, ratePlanIdToRemove) match
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(s"success = false")
  }

  override def preview(subscriptionId: String, billingPeriod: BillingPeriod, price: Double, ratePlanIdToRemove: String): ZIO[GuStageLive.Stage, String, SubscriptionUpdatePreviewResponse] = {
    val subscriptionUpdatePreviewResponse = SubscriptionUpdatePreviewResponse(
      SubscriptionUpdateInvoice(
        10,
        List(
          SubscriptionUpdateInvoiceItem(-10, "2c92c0f85e2d19af015e3896e84d092e"),
          SubscriptionUpdateInvoiceItem(20, "8ad09fc281de1ce70181de3b29223787"),
        ),
      ),
    )
    ZIO.succeed(subscriptionUpdatePreviewResponse) //TODO: test this for real
  }

}

object MockSubscriptionUpdate {
  def requests: ZIO[MockSubscriptionUpdate, Nothing, List[(String, BillingPeriod, Double, String)]] =
    ZIO.serviceWith[MockSubscriptionUpdate](_.requests)
}

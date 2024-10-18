package com.gu.productmove.zuora

import com.gu.productmove.GuStageLive
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError, PreviewResult}
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.SubscriptionUpdatePreviewResponse
import com.gu.productmove.zuora.model.SubscriptionName
import zio.*
import com.gu.i18n.Currency
import com.gu.newproduct.api.productcatalog.BillingPeriod
import zio.json.JsonDecoder

class MockSubscriptionUpdate(
    preview: Map[(SubscriptionName, SubscriptionUpdateRequest), SubscriptionUpdatePreviewResponse],
    update: Map[(SubscriptionName, SubscriptionUpdateRequest), SubscriptionUpdateResponse],
) extends SubscriptionUpdate {

  private var mutableStore: List[(SubscriptionName, SubscriptionUpdateRequest)] =
    Nil // we need to remember the side effects

  def requests = mutableStore.reverse

  override def update[R: JsonDecoder](
      subscriptionName: SubscriptionName,
      requestBody: SubscriptionUpdateRequest,
  ): Task[R] = {
    val params = (subscriptionName, requestBody)
    mutableStore = params :: mutableStore

    preview.get(subscriptionName, requestBody) match {
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse.asInstanceOf[R])
      case None =>
        update.get(subscriptionName, requestBody) match {
          case Some(stubbedResponse) => ZIO.succeed(stubbedResponse.asInstanceOf[R])
          case None => ZIO.fail(new Throwable(s"mock: success = false subscriptionUpdate: " + params))
        }
    }
  }
}

object MockSubscriptionUpdate {
  def requests: ZIO[MockSubscriptionUpdate, Nothing, List[(SubscriptionName, SubscriptionUpdateRequest)]] =
    ZIO.serviceWith[MockSubscriptionUpdate](_.requests)
}

package com.gu.productmove.zuora

import com.gu.newproduct.api.productcatalog.BillingPeriod
import com.gu.productmove.GuStageLive
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError, PreviewResult}
import com.gu.productmove.zuora.GetSubscription
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.SubscriptionUpdatePreviewResponse
import com.gu.productmove.zuora.model.SubscriptionName
import zio.{IO, ZIO}
import com.gu.i18n.Currency
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
  ): ZIO[Any, ErrorResponse, R] = {
    mutableStore = (subscriptionName, requestBody) :: mutableStore

    preview.get(subscriptionName, requestBody) match {
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse.asInstanceOf[R])
      case None =>
        update.get(subscriptionName, requestBody) match {
          case Some(stubbedResponse) => ZIO.succeed(stubbedResponse.asInstanceOf[R])
          case None => ZIO.fail(InternalServerError(s"success = false"))
        }
    }
  }
}

object MockSubscriptionUpdate {
  def requests: ZIO[MockSubscriptionUpdate, Nothing, List[(SubscriptionName, SubscriptionUpdateRequest)]] =
    ZIO.serviceWith[MockSubscriptionUpdate](_.requests)
}

package com.gu.productmove.zuora

import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
import com.gu.productmove.zuora.model.SubscriptionName
import zio.*

import scala.collection.mutable.ArrayBuffer

class MockGetSubscription(responses: Map[SubscriptionName, GetSubscription.GetSubscriptionResponse])
    extends GetSubscription {
  private val requests: ArrayBuffer[SubscriptionName] = ArrayBuffer.empty

  override def get(subscriptionName: SubscriptionName): Task[GetSubscription.GetSubscriptionResponse] = {
    requests += subscriptionName

    responses.get(subscriptionName) match {
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None => ZIO.fail(new Throwable(s"mock: success = false, subscription not found: ${subscriptionName.value}"))
    }
  }
}

object MockGetSubscription {
  def requests: ZIO[MockGetSubscription, Nothing, List[SubscriptionName]] =
    ZIO.serviceWith[MockGetSubscription](_.requests.toList)
}

package com.gu.productmove.zuora

import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
import com.gu.productmove.zuora.model.SubscriptionName
import zio.ZIO

import scala.collection.mutable.ArrayBuffer

class MockZuoraSetCancellationReason(stubs: Map[(SubscriptionName, Int, String), UpdateResponse])
    extends ZuoraSetCancellationReason {

  val requests: ArrayBuffer[(SubscriptionName, Int, String)] = ArrayBuffer.empty

  def update(
      subscriptionName: SubscriptionName,
      subscriptionVersion: Int,
      userCancellationReason: String,
  ): ZIO[Any, ErrorResponse, UpdateResponse] = {
    requests += ((subscriptionName, subscriptionVersion, userCancellationReason))
    stubs.get(subscriptionName, subscriptionVersion, userCancellationReason) match {
      case Some(response) => ZIO.succeed(response)
      case None =>
        ZIO.fail(
          InternalServerError(
          s"MockZuoraSetCancellationReason: No response stubbed for input: (${subscriptionName.value}, $subscriptionVersion, $userCancellationReason)",
        ))
    }
  }
}

object MockZuoraSetCancellationReason {
  def requests: ZIO[MockZuoraSetCancellationReason, Nothing, List[(SubscriptionName, Int, String)]] =
    ZIO.serviceWith[MockZuoraSetCancellationReason](_.requests.toList)
}

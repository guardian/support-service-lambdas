package com.gu.productmove.zuora

import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
import com.gu.productmove.endpoint.zuora.GetSubscriptionToCancel
import com.gu.productmove.endpoint.zuora.GetSubscriptionToCancel.GetSubscriptionToCancelResponse
import com.gu.productmove.zuora.model.SubscriptionName
import zio.*

import scala.collection.mutable.ArrayBuffer

class MockGetSubscriptionToCancel(responses: Map[SubscriptionName, GetSubscriptionToCancelResponse])
    extends GetSubscriptionToCancel {
  val requests: ArrayBuffer[SubscriptionName] = ArrayBuffer.empty

  override def get(subscriptionName: SubscriptionName): Task[GetSubscriptionToCancelResponse] = {
    requests += subscriptionName

    responses.get(subscriptionName) match {
      case Some(stubbedResponse) => ZIO.succeed(stubbedResponse)
      case None =>
        ZIO.fail(
          new Throwable(
            s"MockGetSubscriptionToCancel: No response stubbed for subscriptionId: ${subscriptionName.value}",
          ),
        )
    }
  }
}

object MockGetSubscriptionToCancel {
  def requests: ZIO[MockGetSubscriptionToCancel, Nothing, List[SubscriptionName]] =
    ZIO.serviceWith[MockGetSubscriptionToCancel](_.requests.toList)
}

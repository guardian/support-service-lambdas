package com.gu.productmove.zuora

import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ErrorResponse
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.rest.ZuoraGet
import com.gu.productmove.zuora.*
import sttp.capabilities.zio.ZioStreams
import sttp.capabilities.{Effect, WebSockets}
import sttp.client3.*
import sttp.client3.httpclient.zio.HttpClientZioBackend
import sttp.client3.ziojson.*
import sttp.model.Uri
import zio.json.*
import zio.{Clock, IO, RIO, Task, UIO, URLayer, ZIO, ZLayer}

import java.time.LocalDate

trait ZuoraCancel {
  def cancel(
      subscriptionName: SubscriptionName,
      cancellationEffectiveDate: LocalDate,
  ): Task[CancellationResponse]
}

object ZuoraCancelLive {
  val layer: URLayer[ZuoraGet, ZuoraCancel] = ZLayer.fromFunction(ZuoraCancelLive(_))
}

private class ZuoraCancelLive(zuoraGet: ZuoraGet) extends ZuoraCancel {
  override def cancel(
      subscriptionName: SubscriptionName,
      cancellationEffectiveDate: LocalDate,
  ): Task[CancellationResponse] = {
    val cancellationRequest = CancellationRequest(cancellationEffectiveDate)

    zuoraGet.put[CancellationRequest, CancellationResponse](
      uri"subscriptions/${subscriptionName.value}/cancel",
      cancellationRequest,
    )
  }
}

object ZuoraCancel {
  def cancel(
      subscriptionName: SubscriptionName,
      cancellationEffectiveDate: LocalDate,
  ): RIO[ZuoraCancel, CancellationResponse] =
    ZIO.serviceWithZIO[ZuoraCancel](_.cancel(subscriptionName, cancellationEffectiveDate))
}

case class CancellationRequest(
    cancellationEffectiveDate: LocalDate,
    runBilling: Boolean = false,
    cancellationPolicy: String = "SpecificDate",
)

given JsonEncoder[CancellationRequest] = DeriveJsonEncoder.gen[CancellationRequest]

case class CancellationResponse(
    subscriptionId: String,
    cancelledDate: LocalDate,
)

given JsonDecoder[CancellationResponse] = DeriveJsonDecoder.gen[CancellationResponse]

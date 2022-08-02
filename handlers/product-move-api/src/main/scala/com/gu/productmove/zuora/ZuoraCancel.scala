package com.gu.productmove.zuora

import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.zuora.{CaseId, ChargeOverrides, CreateSubscriptionResponse, ProductRatePlanChargeId, ProductRatePlanId, SubscribeToRatePlans, ZuoraAccountId}
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.rest.ZuoraGet
import sttp.capabilities.zio.ZioStreams
import sttp.capabilities.{Effect, WebSockets}
import sttp.client3.*
import sttp.client3.httpclient.zio.{HttpClientZioBackend, SttpClient, send}
import sttp.client3.ziojson.*
import sttp.model.Uri
import zio.json.*
import zio.{Clock, IO, RIO, Task, UIO, URLayer, ZIO, ZLayer}

import java.time.LocalDate

trait ZuoraCancel:
  def cancel(subscriptionNumber: String, cancellationEffectiveDate: LocalDate): ZIO[Any, String, CancellationResponse]

object ZuoraCancelLive:
  val layer: URLayer[ZuoraGet, ZuoraCancel] = ZLayer.fromFunction(ZuoraCancelLive(_))

private class ZuoraCancelLive(zuoraGet: ZuoraGet) extends ZuoraCancel :
  override def cancel(subscriptionNumber: String, cancellationEffectiveDate: LocalDate): ZIO[Any, String, CancellationResponse] = {
    val cancellationRequest = CancellationRequest(cancellationEffectiveDate)

    zuoraGet.put[CancellationRequest, CancellationResponse](uri"subscriptions/$subscriptionNumber/cancel", cancellationRequest)
  }

object ZuoraCancel {
  def cancel(subscriptionNumber: String, cancellationEffectiveDate: LocalDate): ZIO[ZuoraCancel, String, CancellationResponse] =
    ZIO.serviceWithZIO[ZuoraCancel](_.cancel(subscriptionNumber, cancellationEffectiveDate))
}

case class CancellationRequest(
  cancellationEffectiveDate: LocalDate,
  cancellationPolicy: String = "SpecificDate"
)

given JsonEncoder[CancellationRequest] = DeriveJsonEncoder.gen[CancellationRequest]

case class CancellationResponse(
  subscriptionId: String,
  cancellationDate: LocalDate
)

given JsonDecoder[CancellationResponse] = DeriveJsonDecoder.gen[CancellationResponse]

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

trait Cancellation:
  def cancel(subscriptionNumber: String, chargedThroughDate: LocalDate): ZIO[Any, String, CreateSubscriptionResponse]

object CancellationLive :
  val layer: URLayer[ZuoraGet, Cancellation] = ZLayer.fromFunction(CancellationLive(_))

private class CancellationLive(zuoraGet: ZuoraGet) extends Cancellation:
  override def cancel(subscriptionNumber: String, chargedThroughDate: LocalDate): ZIO[Any, String, CreateSubscriptionResponse] = {
    val cancellationRequest = CancellationRequest(chargedThroughDate)

    zuoraGet.put[CancellationRequest, CreateSubscriptionResponse] (uri"subscriptions/$subscriptionNumber/cancel", cancellationRequest)
  }

object Cancellation {
  def cancel(subscriptionNumber: String, chargedThroughDate: LocalDate): ZIO[Cancellation, String, CreateSubscriptionResponse] =
    ZIO.serviceWithZIO[Cancellation](_.cancel(subscriptionNumber, chargedThroughDate))
}

case class CancellationRequest(
                             cancellationEffectiveDate: LocalDate,
                             cancellationPolicy: String = "SpecificDate"
                           )
given JsonEncoder[CancellationRequest] = DeriveJsonEncoder.gen[CancellationRequest]

package com.gu.productmove.zuora

import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.rest.ZuoraGet
import sttp.capabilities.zio.ZioStreams
import sttp.capabilities.{Effect, WebSockets}
import sttp.client3.*
import sttp.client3.httpclient.zio.{HttpClientZioBackend, SttpClient, send}
import sttp.client3.ziojson.*
import sttp.model.Uri
import zio.json.*
import zio.{IO, RIO, Task, URLayer, ZIO, ZLayer}

object GetSubscriptionLive :
  val layer: URLayer[ZuoraGet, GetSubscription] = ZLayer.fromFunction(GetSubscriptionLive(_))

private class GetSubscriptionLive(zuoraGet: ZuoraGet) extends GetSubscription:
  override def get(subscriptionNumber: String): IO[String, GetSubscriptionResponse] =
    zuoraGet.get[GetSubscriptionResponse](uri"subscriptions/$subscriptionNumber")

trait GetSubscription :
  def get(subscriptionNumber: String): IO[String, GetSubscriptionResponse]

object GetSubscription {

  case class GetSubscriptionResponse(accountNumber: String)

  given JsonDecoder[GetSubscriptionResponse] = DeriveJsonDecoder.gen[GetSubscriptionResponse]

  def get(subscriptionNumber: String): ZIO[GetSubscription, String, GetSubscriptionResponse] =
    ZIO.serviceWithZIO[GetSubscription](_.get(subscriptionNumber))

}

package com.gu.productmove.zuora

import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import sttp.capabilities.zio.ZioStreams
import sttp.capabilities.{Effect, WebSockets}
import sttp.client3.*
import sttp.client3.httpclient.zio.{HttpClientZioBackend, SttpClient, send}
import sttp.client3.ziojson.*
import sttp.model.Uri
import zio.json.*
import zio.{RIO, Task, ZIO, ZLayer}

object GetSubscription {

  case class GetSubscriptionResponse(id: String)

  given JsonDecoder[GetSubscriptionResponse] = DeriveJsonDecoder.gen[GetSubscriptionResponse]

  def get(subscriptionNumber: String): ZIO[ZuoraClient, String, Response[Either[String, GetSubscriptionResponse]]] =
    ZuoraClient.get[GetSubscriptionResponse](uri"subscriptions/$subscriptionNumber")
    
}

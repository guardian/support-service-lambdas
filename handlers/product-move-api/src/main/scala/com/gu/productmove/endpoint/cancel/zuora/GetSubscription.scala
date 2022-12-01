package com.gu.productmove.endpoint.cancel.zuora

import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.cancel.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.rest.ZuoraGet
import sttp.capabilities.zio.ZioStreams
import sttp.capabilities.{Effect, WebSockets}
import sttp.client3.*
import sttp.client3.httpclient.zio.HttpClientZioBackend
import sttp.client3.ziojson.*
import sttp.model.Uri
import zio.json.*
import zio.{IO, RIO, Task, URLayer, ZIO, ZLayer}

import java.time.LocalDate

object GetSubscriptionLive:
  val layer: URLayer[ZuoraGet, GetSubscription] = ZLayer.fromFunction(GetSubscriptionLive(_))

private class GetSubscriptionLive(zuoraGet: ZuoraGet) extends GetSubscription :
  override def get(subscriptionNumber: String): IO[String, GetSubscriptionResponse] =
    zuoraGet.get[GetSubscriptionResponse](uri"subscriptions/$subscriptionNumber?charge-detail=current-segment")

trait GetSubscription:
  def get(subscriptionNumber: String): IO[String, GetSubscriptionResponse]

object GetSubscription {

  case class GetSubscriptionResponse(
    id: String,
    version: Int,
    contractEffectiveDate: LocalDate,
    accountId: String,
    ratePlans: List[RatePlan]
  )

  case class RatePlan(
    productName: String,
    ratePlanName: String,
    ratePlanCharges: List[RatePlanCharge],
    productRatePlanId: String,
    id: String,
  )

  case class RatePlanCharge(
    name: String,
    number: String,
    price: BigDecimal,
    billingPeriod: Option[String],
    effectiveStartDate: LocalDate,
    chargedThroughDate: Option[LocalDate],
    productRatePlanChargeId: String,
    effectiveEndDate: LocalDate,
  )

  given JsonDecoder[GetSubscriptionResponse] = DeriveJsonDecoder.gen[GetSubscriptionResponse]
  given JsonDecoder[RatePlan] = DeriveJsonDecoder.gen[RatePlan]
  given JsonDecoder[RatePlanCharge] = DeriveJsonDecoder.gen[RatePlanCharge]

  def get(subscriptionNumber: String): ZIO[GetSubscription, String, GetSubscriptionResponse] =
    ZIO.serviceWithZIO[GetSubscription](_.get(subscriptionNumber))

}

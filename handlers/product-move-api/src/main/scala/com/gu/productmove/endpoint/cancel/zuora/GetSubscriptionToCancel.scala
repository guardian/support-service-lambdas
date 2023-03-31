package com.gu.productmove.endpoint.zuora

import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.zuora.GetSubscriptionToCancel.Response
import com.gu.productmove.zuora.model.SubscriptionName
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

object GetSubscriptionToCancelLive:
  val layer: URLayer[ZuoraGet, GetSubscriptionToCancel] = ZLayer.fromFunction(GetSubscriptionToCancelLive(_))

private class GetSubscriptionToCancelLive(zuoraGet: ZuoraGet) extends GetSubscriptionToCancel:
  override def get(subscriptionName: SubscriptionName): IO[String, GetSubscriptionToCancel.Response] =
    zuoraGet.get[GetSubscriptionToCancel.Response](
      uri"subscriptions/${subscriptionName.value}?charge-detail=current-segment",
    )

trait GetSubscriptionToCancel:
  def get(subscriptionName: SubscriptionName): IO[String, GetSubscriptionToCancel.Response]

object GetSubscriptionToCancel {

  case class Response(
      id: String,
      version: Int,
      contractEffectiveDate: LocalDate,
      accountId: String,
      ratePlans: List[RatePlan],
  )

  case class RatePlan(
      productName: String,
      ratePlanName: String,
      lastChangeType: Option[String],
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

  given JsonDecoder[Response] = DeriveJsonDecoder.gen[GetSubscriptionToCancel.Response]
  given JsonDecoder[RatePlan] = DeriveJsonDecoder.gen[RatePlan]
  given JsonDecoder[RatePlanCharge] = DeriveJsonDecoder.gen[RatePlanCharge]

  def get(subscriptionName: SubscriptionName): ZIO[GetSubscriptionToCancel, String, GetSubscriptionToCancel.Response] =
    ZIO.serviceWithZIO[GetSubscriptionToCancel](_.get(subscriptionName))

}

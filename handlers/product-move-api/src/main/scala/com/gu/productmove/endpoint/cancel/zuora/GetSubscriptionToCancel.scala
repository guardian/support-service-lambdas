package com.gu.productmove.endpoint.zuora

import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ErrorResponse
import com.gu.productmove.endpoint.zuora.GetSubscriptionToCancel.GetSubscriptionToCancelResponse
import com.gu.productmove.zuora.model.{AccountNumber, SubscriptionName}
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
  override def get(subscriptionName: SubscriptionName): IO[ErrorResponse, GetSubscriptionToCancelResponse] =
    zuoraGet.get[GetSubscriptionToCancelResponse](
      uri"subscriptions/${subscriptionName.value}?charge-detail=current-segment",
    )

trait GetSubscriptionToCancel:
  def get(subscriptionName: SubscriptionName): IO[ErrorResponse, GetSubscriptionToCancelResponse]

object GetSubscriptionToCancel {

  case class GetSubscriptionToCancelResponse(
      id: String,
      status: String,
      version: Int,
      contractEffectiveDate: LocalDate,
      accountId: String,
      accountNumber: AccountNumber,
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

  given JsonDecoder[GetSubscriptionToCancelResponse] = DeriveJsonDecoder.gen[GetSubscriptionToCancelResponse]
  given JsonDecoder[RatePlan] = DeriveJsonDecoder.gen[RatePlan]
  given JsonDecoder[RatePlanCharge] = DeriveJsonDecoder.gen[RatePlanCharge]

  def get(
      subscriptionName: SubscriptionName,
  ): ZIO[GetSubscriptionToCancel, ErrorResponse, GetSubscriptionToCancelResponse] =
    ZIO.serviceWithZIO[GetSubscriptionToCancel](_.get(subscriptionName))

}

package com.gu.productmove.zuora

import com.gu.i18n.Currency
import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
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

private class GetSubscriptionLive(zuoraGet: ZuoraGet) extends GetSubscription:
  override def get(subscriptionNumber: String): IO[String, GetSubscriptionResponse] =
    zuoraGet.get[GetSubscriptionResponse](uri"subscriptions/$subscriptionNumber")

trait GetSubscription:
  def get(subscriptionNumber: String): IO[String, GetSubscriptionResponse]

object GetSubscription {

  case class GetSubscriptionResponse(id: String, accountId: String, accountNumber: String, ratePlans: List[RatePlan])

  case class RatePlan(
      productName: String,
      ratePlanName: String,
      ratePlanCharges: List[RatePlanCharge],
      productRatePlanId: String,
      id: String,
  )
  object RatePlan {
    given JsonDecoder[RatePlan] = DeriveJsonDecoder.gen[RatePlan]
  }

  case class RatePlanCharge(
      productRatePlanChargeId: String,
      effectiveEndDate: LocalDate,
      name: String,
      number: String,
      price: Double,
      currency: String,
      billingPeriod: BillingPeriod,
      effectiveStartDate: LocalDate,
      chargedThroughDate: Option[LocalDate],
  ) {
    def currencyObject = Currency.fromString(currency)
  }
  object RatePlanCharge {
    given JsonDecoder[RatePlanCharge] = DeriveJsonDecoder.gen
  }

  given JsonDecoder[BillingPeriod] = JsonDecoder[String].mapOrFail {
    case "Month" => Right(Monthly)
    case "Annual" => Right(Annual)
    case x => Left(s"No such billing period $x")
  }

  given JsonDecoder[GetSubscriptionResponse] = DeriveJsonDecoder.gen[GetSubscriptionResponse]
  given JsonDecoder[RatePlan] = DeriveJsonDecoder.gen[RatePlan]
  given JsonDecoder[RatePlanCharge] = DeriveJsonDecoder.gen[RatePlanCharge]

  def get(subscriptionNumber: String): ZIO[GetSubscription, String, GetSubscriptionResponse] =
    ZIO.serviceWithZIO[GetSubscription](_.get(subscriptionNumber))
}

package com.gu.productmove.zuora

import com.amazonaws.xray.AWSXRay
import com.gu.i18n.Currency
import com.gu.newproduct.api.productcatalog.{Monthly, Annual, BillingPeriod}
import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ErrorResponse
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.model.{SubscriptionName, AccountNumber}
import com.gu.productmove.zuora.rest.ZuoraGet
import sttp.capabilities.zio.ZioStreams
import sttp.capabilities.{WebSockets, Effect}
import sttp.client3.*
import sttp.client3.httpclient.zio.HttpClientZioBackend
import sttp.client3.ziojson.*
import sttp.model.Uri
import zio.json.*
import zio.{URLayer, Task, ZLayer, RIO, ZIO, IO}

import java.time.LocalDate

object GetSubscriptionLive:
  val layer: URLayer[ZuoraGet, GetSubscription] = ZLayer.fromFunction(GetSubscriptionLive(_))

private class GetSubscriptionLive(zuoraGet: ZuoraGet) extends GetSubscription:
  override def get(subscriptionName: SubscriptionName): IO[ErrorResponse, GetSubscriptionResponse] =
    zuoraGet.get[GetSubscriptionResponse](uri"subscriptions/${subscriptionName.value}")

trait GetSubscription:
  def get(subscriptionName: SubscriptionName): IO[ErrorResponse, GetSubscriptionResponse]

object GetSubscription {

  case class GetSubscriptionResponse(
      id: String,
      accountId: String,
      accountNumber: AccountNumber,
      ratePlans: List[RatePlan],
  )

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
      price: Option[Double],
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
    case other => Left(s"No such billing period $other")
  }

  given JsonDecoder[GetSubscriptionResponse] = DeriveJsonDecoder.gen[GetSubscriptionResponse]
  given JsonDecoder[RatePlan] = DeriveJsonDecoder.gen[RatePlan]
  given JsonDecoder[RatePlanCharge] = DeriveJsonDecoder.gen[RatePlanCharge]

  def get(subscriptionName: SubscriptionName): ZIO[GetSubscription, ErrorResponse, GetSubscriptionResponse] = {
    val subsegment = AWSXRay.beginSubsegment("Get subscription")
    ZIO.serviceWithZIO[GetSubscription](_.get(subscriptionName).debug { subsegment.end; "" })
  }
}

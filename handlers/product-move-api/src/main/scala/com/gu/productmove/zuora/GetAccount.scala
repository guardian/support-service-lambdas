package com.gu.productmove.zuora

import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.available.{Currency, TimeUnit}
import com.gu.productmove.zuora.GetAccount.{GetAccountResponse, PaymentMethodResponse}
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.rest.ZuoraClientLive.{ZuoraRestConfig, bucket, key}
import com.gu.productmove.zuora.rest.ZuoraGet
import sttp.capabilities.zio.ZioStreams
import sttp.capabilities.{Effect, WebSockets}
import sttp.client3.*
import sttp.client3.httpclient.zio.{HttpClientZioBackend, SttpClient, send}
import sttp.client3.ziojson.*
import sttp.model.Uri
import zio.json.*
import zio.{IO, RIO, Task, URLayer, ZIO, ZLayer}

import java.time.LocalDate
import scala.math.BigDecimal.RoundingMode.HALF_UP
import scala.util.Try

object GetAccountLive:
  val layer: URLayer[ZuoraGet, GetAccount] = ZLayer.fromFunction(GetAccountLive(_))

private class GetAccountLive(zuoraGet: ZuoraGet) extends GetAccount :
  override def get(accountNumber: String): IO[String, GetAccountResponse] =
    zuoraGet.get[GetAccountResponse](uri"accounts/$accountNumber/summary")

  override def getPaymentMethod(paymentMethodId: String): IO[String, PaymentMethodResponse] =
    zuoraGet.get[PaymentMethodResponse](uri"object/payment-method/$paymentMethodId")

trait GetAccount:
  def get(subscriptionNumber: String): ZIO[GetAccount, String, GetAccountResponse]

  def getPaymentMethod(paymentMethodId: String): ZIO[GetAccount, String, PaymentMethodResponse]

object GetAccount {
  case class PaymentMethodResponse(NumConsecutiveFailures: Int)

  given JsonDecoder[PaymentMethodResponse] = DeriveJsonDecoder.gen[PaymentMethodResponse]

  case class GetAccountResponse(
    basicInfo: BasicInfo,
    subscriptions: List[GetSubscriptionResponse],
  )

  case class BasicInfo(
    defaultPaymentMethod: DefaultPaymentMethod
  )

  /* The zuora API has slightly different responses for ratePlans in the catalogue and when querying a subscription, e.g.: productRatePlanId in the subscription response and id in the catalogue response */

  case class ZuoraSubscription(
    ratePlans: List[ZuoraRatePlan]
  )

  case class ZuoraRatePlan(
    productRatePlanId: String // TBC what field should we check in the rateplan to know it's a recurring contribution?
    /*
    {
                    "productId": "2c92c0f84b786da2014b91d3629b4298",//DEV
                    "productName": "Digital Pack",
                    "productSku": "SKU-00000022",
                    "productRatePlanId": "2c92c0f94bbffaaa014bc6a4212e205b",//DEV
                    "ratePlanName": "Digital Pack Annual"
                }*/
  )

  given JsonDecoder[GetAccountResponse] = DeriveJsonDecoder.gen
  given JsonDecoder[ZuoraSubscription] = DeriveJsonDecoder.gen
  given JsonDecoder[ZuoraRatePlan] = DeriveJsonDecoder.gen
  given JsonDecoder[BasicInfo] = DeriveJsonDecoder.gen

  def get(accountNumber: String): ZIO[GetAccount, String, GetAccountResponse] =
    ZIO.serviceWithZIO[GetAccount](_.get(accountNumber))

  def getPaymentMethod(paymentMethodId: String): ZIO[GetAccount, String, PaymentMethodResponse] = ZIO.serviceWithZIO[GetAccount](_.getPaymentMethod(paymentMethodId))
}

case class DefaultPaymentMethod(
  id: String,
  creditCardExpirationMonth: LocalDate,
)

object DefaultPaymentMethod {

  private case class WireDefaultPaymentMethod(
    id: String,
    creditCardExpirationMonth: Int,
    creditCardExpirationYear: Int,
  )

  given JsonDecoder[DefaultPaymentMethod] =
    DeriveJsonDecoder.gen[WireDefaultPaymentMethod].mapOrFail {
      case WireDefaultPaymentMethod(id, creditCardExpirationMonth, creditCardExpirationYear) =>
        for {
          expiry <- Try(LocalDate.of(creditCardExpirationYear, creditCardExpirationMonth, 1)).toEither.left.map(_.toString)
        } yield DefaultPaymentMethod(id, expiry.plusMonths(1)) // valid until the end of the month
    }

}

/*
* Don't use discount percentage from product catalogue,
* because it can be overridden so the default value is unreliable.
*/
// price can be null, this is only for percentage discounts, so default to 0 rather than option handling
case class ZuoraPricing(currency: String, price: BigDecimal = 0.000000000)
object ZuoraPricing {
  given JsonDecoder[ZuoraPricing] = DeriveJsonDecoder.gen[ZuoraPricing]
}

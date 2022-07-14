package com.gu.productmove.zuora

import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.zuora.GetAccount.GetAccountResponse
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
import scala.util.Try

object GetAccountLive :
  val layer: URLayer[ZuoraGet, GetAccount] = ZLayer.fromFunction(GetAccountLive(_))

private class GetAccountLive(zuoraGet: ZuoraGet) extends GetAccount:
  override def get(accountNumber: String): IO[String, GetAccountResponse] =
    zuoraGet.get[GetAccountResponse](uri"accounts/$accountNumber/summary")

trait GetAccount :
  def get(subscriptionNumber: String): IO[String, GetAccountResponse]

object GetAccount {

  case class GetAccountResponse(
    balanceMinorUnits: AmountMinorUnits,
    currency: String,
    basicInfo: BasicInfo,
    subscriptions: List[ZuoraSubscription],
  )
  case class AmountMinorUnits(amount: Int)
  case class BasicInfo(
    defaultPaymentMethod: DefaultPaymentMethod
  )
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

  given JsonDecoder[AmountMinorUnits] = JsonDecoder[Double].map(double => (double * 100).toInt).map(AmountMinorUnits.apply)
  given JsonDecoder[GetAccountResponse] = DeriveJsonDecoder.gen
  given JsonDecoder[ZuoraSubscription] = DeriveJsonDecoder.gen
  given JsonDecoder[ZuoraRatePlan] = DeriveJsonDecoder.gen
  given JsonDecoder[BasicInfo] = DeriveJsonDecoder.gen

  def get(accountNumber: String): ZIO[GetAccount, String, GetAccountResponse] =
    ZIO.serviceWithZIO[GetAccount](_.get(accountNumber))

}

case class DefaultPaymentMethod(
  creditCardExpiration: LocalDate,
)

object DefaultPaymentMethod {

  private case class WireDefaultPaymentMethod(
    creditCardExpirationMonth: Int,
    creditCardExpirationYear: Int,
  )

  given JsonDecoder[DefaultPaymentMethod] =
    DeriveJsonDecoder.gen[WireDefaultPaymentMethod].mapOrFail {
      case WireDefaultPaymentMethod(creditCardExpirationMonth, creditCardExpirationYear) =>
        for {
          expiry <- Try(LocalDate.of(creditCardExpirationYear, creditCardExpirationMonth, 1)).toEither.left.map(_.toString)
        } yield DefaultPaymentMethod(expiry.plusMonths(1)) // valid until the end of the month
    }

}

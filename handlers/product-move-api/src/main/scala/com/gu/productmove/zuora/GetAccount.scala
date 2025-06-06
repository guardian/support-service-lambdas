package com.gu.productmove.zuora

import com.gu.productmove.{AwsS3, IdentityId}
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.available.Currency.currencyCodetoObject
import com.gu.productmove.endpoint.available.{Currency, TimeUnit}
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ErrorResponse
import com.gu.productmove.zuora.DefaultPaymentMethod
import com.gu.productmove.zuora.GetAccount.{GetAccountResponse, PaymentMethodResponse}
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.model.AccountNumber
import com.gu.productmove.zuora.rest.ZuoraClientLive.ZuoraRestConfig
import com.gu.productmove.zuora.rest.ZuoraGet
import com.gu.productmove.zuora.rest.ZuoraRestBody.ZuoraSuccessCheck
import sttp.capabilities.zio.ZioStreams
import sttp.capabilities.{Effect, WebSockets}
import sttp.client3.*
import sttp.client3.httpclient.zio.HttpClientZioBackend
import sttp.client3.ziojson.*
import sttp.model.Uri
import zio.json.*
import zio.{IO, RIO, Task, UIO, URLayer, ZIO, ZLayer}

import java.time.LocalDate
import scala.math.BigDecimal.RoundingMode.HALF_UP
import scala.util.Try

object GetAccountLive {
  val layer: URLayer[ZuoraGet, GetAccount] = ZLayer.fromFunction(GetAccountLive(_))
}

private class GetAccountLive(zuoraGet: ZuoraGet) extends GetAccount {
  override def get(accountNumber: AccountNumber): Task[GetAccountResponse] =
    zuoraGet
      .get[GetAccountResponse](uri"accounts/${accountNumber.value}/summary", ZuoraSuccessCheck.SuccessCheckLowercase)

  override def getPaymentMethod(paymentMethodId: String): Task[PaymentMethodResponse] =
    zuoraGet.get[PaymentMethodResponse](uri"object/payment-method/$paymentMethodId", ZuoraSuccessCheck.SuccessCheckSize)
}

trait GetAccount {
  def get(subscriptionNumber: AccountNumber): Task[GetAccountResponse]

  def getPaymentMethod(paymentMethodId: String): Task[PaymentMethodResponse]
}

object GetAccount {
  case class PaymentMethodResponse(NumConsecutiveFailures: Int)

  given JsonDecoder[PaymentMethodResponse] = DeriveJsonDecoder.gen[PaymentMethodResponse]

  case class GetAccountResponse(
      basicInfo: BasicInfo,
      billToContact: BillToContact,
      subscriptions: List[AccountSubscription],
  )

  case class AccountSubscription(
      id: String,
  )

  case class BasicInfo(
      id: ZuoraAccountId,
      defaultPaymentMethod: DefaultPaymentMethod,
      IdentityId__c: Option[IdentityId],
      sfContactId__c: String,
      balance: BigDecimal,
      currency: Currency,
  )

  case class BillToContact(
      firstName: String,
      lastName: String,
      workEmail: String,
  )

  object BasicInfo {
    private case class BasicInfoWire(
        id: String,
        defaultPaymentMethod: DefaultPaymentMethod,
        IdentityId__c: Option[String],
        sfContactId__c: String,
        balance: BigDecimal,
        currency: String,
    )

    given JsonDecoder[BasicInfo] = DeriveJsonDecoder.gen[BasicInfoWire].map {
      case BasicInfoWire(id, defaultPaymentMethod, identityId, sfContactId__c, balance, currency) =>
        BasicInfo(
          id = ZuoraAccountId(id),
          defaultPaymentMethod = defaultPaymentMethod,
          IdentityId__c = identityId.filter(_ != "").map(IdentityId.apply),
          sfContactId__c = sfContactId__c,
          balance = (balance.toDouble * 100).toInt,
          currency = currencyCodetoObject(currency),
        )
    }
  }

  /* The zuora API has slightly different responses for ratePlans in the catalogue and when querying a subscription, e.g.: productRatePlanId in the subscription response and id in the catalogue response */

  case class ZuoraSubscription(
      ratePlans: List[ZuoraRatePlan],
  )

  case class ZuoraRatePlan(
      productRatePlanId: String, // TBC what field should we check in the rateplan to know it's a recurring contribution?
      /*
    {
                    "productId": "2c92c0f84b786da2014b91d3629b4298", // CODE
                    "productName": "Digital Pack",
                    "productSku": "SKU-00000022",
                    "productRatePlanId": "2c92c0f94bbffaaa014bc6a4212e205b", // CODE
                    "ratePlanName": "Digital Pack Annual"
                }*/
  )

  given JsonDecoder[GetAccountResponse] = DeriveJsonDecoder.gen

  given JsonDecoder[AccountSubscription] = DeriveJsonDecoder.gen

  given JsonDecoder[ZuoraSubscription] = DeriveJsonDecoder.gen

  given JsonDecoder[ZuoraRatePlan] = DeriveJsonDecoder.gen

  given JsonDecoder[BillToContact] = DeriveJsonDecoder.gen

  def get(accountNumber: AccountNumber): RIO[GetAccount, GetAccountResponse] =
    ZIO.serviceWithZIO[GetAccount](_.get(accountNumber))

  def getPaymentMethod(paymentMethodId: String): RIO[GetAccount, PaymentMethodResponse] =
    ZIO.serviceWithZIO[GetAccount](_.getPaymentMethod(paymentMethodId))
}

case class DefaultPaymentMethod(
    id: String,
    creditCardExpirationDate: Option[LocalDate],
)

object DefaultPaymentMethod {
  private case class WireDefaultPaymentMethod(
      id: String,
      creditCardExpirationMonth: Option[Int],
      creditCardExpirationYear: Option[Int],
  )

  given JsonDecoder[DefaultPaymentMethod] =
    DeriveJsonDecoder.gen[WireDefaultPaymentMethod].map { case WireDefaultPaymentMethod(id, month, year) =>
      val creditCardExpirationDate = for {
        creditCardExpirationMonth <- month
        creditCardExpirationYear <- year
      } yield LocalDate.of(creditCardExpirationYear, creditCardExpirationMonth, 1)

      DefaultPaymentMethod(id, creditCardExpirationDate)
    }
}

/*
 * Don't use discount percentage from product catalogue,
 * because it can be overridden so the default value is unreliable.
 */
// price can be null, this is only for percentage discounts, so default to 0 rather than option handling
case class ZuoraPricing(currency: String, priceMinorUnits: Int)

object ZuoraPricing {
  private case class ZuoraPricingWire(currency: String, price: BigDecimal = 0.000000000)

  given JsonDecoder[ZuoraPricing] = DeriveJsonDecoder.gen[ZuoraPricingWire].map {
    case ZuoraPricingWire(currency, price) => ZuoraPricing(currency, (price.toDouble * 100).toInt)
  }
}

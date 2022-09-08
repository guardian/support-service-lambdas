package com.gu.productmove.zuora

import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.zuora.{CaseId, ChargeOverrides, CreateSubscriptionResponse, ProductRatePlanChargeId, ProductRatePlanId, SubscribeToRatePlans, ZuoraAccountId}
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.rest.ZuoraGet
import sttp.capabilities.zio.ZioStreams
import sttp.capabilities.{Effect, WebSockets}
import sttp.client3.*
import sttp.client3.httpclient.zio.HttpClientZioBackend
import sttp.client3.ziojson.*
import sttp.model.Uri
import zio.json.*
import zio.{Clock, IO, RIO, Task, UIO, URLayer, ZIO, ZLayer}

import java.time.LocalDate

trait Subscribe:
  def create(zuoraAccountId: String, targetProductId: String): ZIO[Any, String, CreateSubscriptionResponse]

object SubscribeLive:
  val layer: URLayer[ZuoraGet, Subscribe] = ZLayer.fromFunction(SubscribeLive(_))

private class SubscribeLive(zuoraGet: ZuoraGet) extends Subscribe :
  override def create(zuoraAccountId: String, targetProductId: String): ZIO[Any, String, CreateSubscriptionResponse] = {
    for {
      subscribeRequest <- SubscribeRequest.withTodaysDate(zuoraAccountId, targetProductId)
      response <- zuoraGet.post[SubscribeRequest, CreateSubscriptionResponse](uri"subscriptions", subscribeRequest)
    } yield response
  }

object Subscribe {
  def create(zuoraAccountId: String, targetProductId: String): ZIO[Subscribe, String, CreateSubscriptionResponse] =
    ZIO.serviceWithZIO[Subscribe](_.create(zuoraAccountId, targetProductId))
}

case class ProductRatePlanId(value: String) extends AnyVal
case class ProductRatePlanChargeId(value: String) extends AnyVal
case class CreateSubscriptionResponse(subscriptionId: String)

given JsonDecoder[CreateSubscriptionResponse] = DeriveJsonDecoder.gen[CreateSubscriptionResponse]

case class ChargeOverrides(
  price: Option[Double],
  productRatePlanChargeId: String,
  triggerDate: Option[LocalDate],
  triggerEvent: Option[String]
)

given JsonEncoder[ChargeOverrides] = DeriveJsonEncoder.gen[ChargeOverrides]

case class ZuoraAccountId(value: String) extends AnyVal
case class CaseId(value: String) extends AnyVal
case class AcquisitionSource(value: String) extends AnyVal

case class SubscribeToRatePlans(productRatePlanId: String, chargeOverrides: List[ChargeOverrides] = List())

given JsonEncoder[SubscribeToRatePlans] = DeriveJsonEncoder.gen[SubscribeToRatePlans]

case class SubscribeRequest(
  accountKey: String,
  autoRenew: Boolean = true,
  contractEffectiveDate: LocalDate,
  customerAcceptanceDate: LocalDate,
  termType: String = "TERMED",
  renewalTerm: Int = 12,
  initialTerm: Int = 12,
  subscribeToRatePlans: List[SubscribeToRatePlans],
  AcquisitionCase__c: String,
  AcquisitionSource__c: String,
  CreatedByCSR__c: String
)

object SubscribeRequest {
  given JsonEncoder[SubscribeRequest] = DeriveJsonEncoder.gen[SubscribeRequest]

  def withTodaysDate(zuoraAccountId: String, targetProductId: String): ZIO[Any, Nothing, SubscribeRequest] =
    for {
      date <- Clock.currentDateTime.map(_.toLocalDate)
    } yield SubscribeRequest(
      accountKey = zuoraAccountId,
      contractEffectiveDate = date,
      customerAcceptanceDate = date.plusDays(14),   // if there is a free trial, we simply add the 14 days onto the customerAcceptanceDate, no extra rateplans needed. To implement later on.
      subscribeToRatePlans = List(SubscribeToRatePlans(productRatePlanId = targetProductId)),   // hardcode 50% offer for 3 months
      AcquisitionCase__c = "case",
      AcquisitionSource__c = "product-movement",
      CreatedByCSR__c = "na"
    )
}

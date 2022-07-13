package com.gu.productmove.zuora

import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.zuora.Subscribe.{CaseId, ChargeOverrides, CreateSubscriptionResponse, ProductRatePlanChargeId, ProductRatePlanId, SubscribeRequest, SubscribeToRatePlans, ZuoraAccountId}
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.rest.ZuoraGet
import sttp.capabilities.zio.ZioStreams
import sttp.capabilities.{Effect, WebSockets}
import sttp.client3.*
import sttp.client3.httpclient.zio.{HttpClientZioBackend, SttpClient, send}
import sttp.client3.ziojson.*
import sttp.model.Uri
import zio.json.*
import zio.{Clock, IO, RIO, Task, UIO, URLayer, ZIO, ZLayer}

import java.time.LocalDate

/*
val subscribeRequest = SubscribeRequest(
      accountKey = "accountkey",
      autoRenew = true,
      contractEffectiveDate = "2018-07-02",
      customerAcceptanceDate = "2018-07-27",
      termType = "TERMED",
      renewalTerm = 12,
      initialTerm = 12,
      AcquisitionCase__c = "",
      AcquisitionSource__c = "sourcesource",
      CreatedByCSR__c = "csrcsr",
      subscribeToRatePlans = List(SubscribeToRatePlans(productRatePlanId = "rateplanid"))
    )
*/

trait Subscribe:
  def create(body: String): ZIO[Any, String, CreateSubscriptionResponse]
  def createRequestBody(zuoraAccountId: String, targetProductId: String): ZIO[Any, Nothing, String]

object SubscribeLive :
  val layer: URLayer[ZuoraGet, Subscribe] = ZLayer.fromFunction(SubscribeLive(_))

private class SubscribeLive(zuoraGet: ZuoraGet) extends Subscribe:
  override def create(body: String): ZIO[Any, String, CreateSubscriptionResponse] = zuoraGet.post[CreateSubscriptionResponse](uri"subscriptions", body)

  override def createRequestBody(zuoraAccountId: String, targetProductId: String): ZIO[Any, Nothing, String] =
    for {
      date <- Clock.currentDateTime.map(_.toLocalDate)
    } yield SubscribeRequest(
      accountKey = zuoraAccountId,
      contractEffectiveDate = date,
      customerAcceptanceDate = date.plusDays(16),
      subscribeToRatePlans = List(SubscribeToRatePlans(productRatePlanId = targetProductId)),
      AcquisitionCase__c = "case",
      AcquisitionSource__c = "product-movement",
      CreatedByCSR__c = "na"
    ).toJson


object Subscribe {
  case class ProductRatePlanId(value: String) extends AnyVal
  case class ProductRatePlanChargeId(value: String) extends AnyVal

  case class CreateSubscriptionResponse(id: String)
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


  implicit val encoder: JsonEncoder[SubscribeRequest] = DeriveJsonEncoder.gen[SubscribeRequest]

  def create(body: String): ZIO[Subscribe, String, CreateSubscriptionResponse] =
    ZIO.serviceWithZIO[Subscribe](_.create(body))
  def createRequestBody(zuoraAccountId: String, targetProductId: String): ZIO[Subscribe, Nothing, String] = ZIO.serviceWithZIO[Subscribe](_.createRequestBody(zuoraAccountId, targetProductId))
}

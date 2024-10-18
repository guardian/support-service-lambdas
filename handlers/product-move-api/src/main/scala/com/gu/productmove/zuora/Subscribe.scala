package com.gu.productmove.zuora

import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ErrorResponse
import com.gu.productmove.zuora.{
  CaseId,
  ChargeOverrides,
  CreateSubscriptionResponse,
  SubscribeToRatePlans,
  ZuoraAccountId,
}
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

trait Subscribe {
  def create(zuoraAccountId: String, targetProductId: String): RIO[Stage, CreateSubscriptionResponse]
}

object SubscribeLive {
  val layer: URLayer[ZuoraGet, Subscribe] = ZLayer.fromFunction(SubscribeLive(_))
}

private class SubscribeLive(zuoraGet: ZuoraGet) extends Subscribe {
  override def create(
      zuoraAccountId: String,
      targetProductId: String,
  ): RIO[Stage, CreateSubscriptionResponse] = {
    for {
      subscribeRequest <- SubscribeRequest.withTodaysDate(zuoraAccountId, targetProductId)
      response <- zuoraGet.post[SubscribeRequest, CreateSubscriptionResponse](uri"subscriptions", subscribeRequest)
    } yield response
  }
}

object Subscribe {
  def create(
      zuoraAccountId: String,
      targetProductId: String,
  ): RIO[Subscribe with Stage, CreateSubscriptionResponse] =
    ZIO.serviceWithZIO[Subscribe](_.create(zuoraAccountId, targetProductId))
}

case class CreateSubscriptionResponse(subscriptionNumber: String)

given JsonDecoder[CreateSubscriptionResponse] = DeriveJsonDecoder.gen[CreateSubscriptionResponse]

case class ChargeOverrides(
    price: Option[BigDecimal] = None,
    productRatePlanChargeId: String,
    discountPercentage: Option[Int] = None,
    upToPeriods: Option[Int] = None,
    endDateCondition: Option[String] = None,
    triggerDate: Option[LocalDate] = None,
    triggerEvent: Option[String] = None,
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
    CreatedByCSR__c: String,
)

object SubscribeRequest {
  given JsonEncoder[SubscribeRequest] = DeriveJsonEncoder.gen[SubscribeRequest]

  def withTodaysDate(zuoraAccountId: String, targetProductId: String): ZIO[Stage, Nothing, SubscribeRequest] =
    for {
      stage <- ZIO.service[Stage]
      date <- Clock.currentDateTime.map(_.toLocalDate)

      percentageDiscountRatePlanId =
        if (stage == Stage.PROD) "2c92a0ff5345f9220153559d915d5c26" else "2c92c0f85721ff7c01572942235b6d7a"
      percentageDiscountRatePlanChargeId =
        if (stage == Stage.PROD) "2c92a0fd5345efa10153559e97bb76c6" else "2c92c0f957220b5d0157299c97a60bbd"

      // discount hardcoded for MVP (50% off for 3 Months)
      discount = SubscribeToRatePlans(
        productRatePlanId = percentageDiscountRatePlanId,
        List(
          ChargeOverrides(
            productRatePlanChargeId = percentageDiscountRatePlanChargeId,
            discountPercentage = Some(50),
            upToPeriods = Some(3),
            endDateCondition = Some("Fixed_Period"),
          ),
        ),
      )
    } yield SubscribeRequest(
      accountKey = zuoraAccountId,
      contractEffectiveDate = date,
      customerAcceptanceDate = date.plusDays(
        14,
      ), // if there is a free trial, we simply add the 14 days onto the customerAcceptanceDate, no extra rateplans needed. To implement later on.
      subscribeToRatePlans =
        List(SubscribeToRatePlans(productRatePlanId = targetProductId), discount), // hardcode 50% offer for 3 months
      AcquisitionCase__c = "case",
      AcquisitionSource__c = "product-movement",
      CreatedByCSR__c = "na",
    )
}

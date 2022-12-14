package com.gu.productmove.zuora

import com.gu.productmove.AwsS3
import com.gu.newproduct.api.productcatalog.{BillingPeriod, Monthly, Annual}
import com.gu.newproduct.api.productcatalog.ZuoraIds.{
  ProductRatePlanId,
  SupporterPlusZuoraIds,
  ZuoraIds,
  zuoraIdsForStage,
}
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
import zio.{Clock, IO, RIO, Task, UIO, URLayer, ZIO, ZLayer}
import com.gu.util.config

import java.time.LocalDate

trait SubscriptionUpdate:
  def update(
      subscriptionId: String,
      billingPeriod: BillingPeriod,
      price: Double,
      ratePlanIdToRemove: String,
  ): ZIO[Stage, String, SubscriptionUpdateResponse]

object SubscriptionUpdateLive:
  val layer: URLayer[ZuoraGet, SubscriptionUpdate] = ZLayer.fromFunction(SubscriptionUpdateLive(_))

private class SubscriptionUpdateLive(zuoraGet: ZuoraGet) extends SubscriptionUpdate:
  override def update(
      subscriptionId: String,
      billingPeriod: BillingPeriod,
      price: Double,
      ratePlanIdToRemove: String,
  ): ZIO[Stage, String, SubscriptionUpdateResponse] = {
    for {
      requestBody <- SubscriptionUpdateRequest(billingPeriod, ratePlanIdToRemove, price)
      response <- zuoraGet.put[SubscriptionUpdateRequest, SubscriptionUpdateResponse](
        uri"subscriptions/$subscriptionId",
        requestBody,
      )
    } yield response
  }

object SubscriptionUpdate {
  def update(
      subscriptionId: String,
      billingPeriod: BillingPeriod,
      price: Double,
      ratePlanIdToRemove: String,
  ): ZIO[SubscriptionUpdate with Stage, String, SubscriptionUpdateResponse] =
    ZIO.serviceWithZIO[SubscriptionUpdate](_.update(subscriptionId, billingPeriod, price, ratePlanIdToRemove))
}
case class SubscriptionUpdateResponse(subscriptionId: String, totalDeltaMrr: BigDecimal, invoiceId: String)

given JsonDecoder[SubscriptionUpdateResponse] = DeriveJsonDecoder.gen[SubscriptionUpdateResponse]

given JsonEncoder[AddRatePlan] = DeriveJsonEncoder.gen[AddRatePlan]
given JsonEncoder[RemoveRatePlan] = DeriveJsonEncoder.gen[RemoveRatePlan]
given JsonEncoder[SubscriptionUpdateRequest] = DeriveJsonEncoder.gen[SubscriptionUpdateRequest]

case class AddRatePlan(
    contractEffectiveDate: LocalDate,
    productRatePlanId: String,
    chargeOverrides: List[ChargeOverrides],
)
case class RemoveRatePlan(contractEffectiveDate: LocalDate, ratePlanId: String)

case class SubscriptionUpdateRequest(
    add: List[AddRatePlan],
    remove: List[RemoveRatePlan],
    collect: Boolean = true,
    runBilling: Boolean = true,
)
case class SupporterPlusRatePlanIds(ratePlanId: String, ratePlanChargeId: String)

object SubscriptionUpdateRequest {
  given JsonEncoder[SubscriptionUpdateRequest] = DeriveJsonEncoder.gen[SubscriptionUpdateRequest]

  private def getSupporterPlusRatePlanIds(
      ids: ZuoraIds,
      billingPeriod: BillingPeriod,
  ): Either[String, SupporterPlusRatePlanIds] =
    import ids.supporterPlusZuoraIds.{monthly, annual}

    billingPeriod match {
      case Monthly =>
        Right(SupporterPlusRatePlanIds(monthly.productRatePlanId.value, monthly.productRatePlanChargeId.value))
      case Annual =>
        Right(SupporterPlusRatePlanIds(annual.productRatePlanId.value, annual.productRatePlanChargeId.value))
      case _ => Left(s"error when matching on billingPeriod ${billingPeriod}")
    }

  def apply(
      billingPeriod: BillingPeriod,
      ratePlanIdToRemove: String,
      price: Double,
  ): ZIO[Stage, String, SubscriptionUpdateRequest] =
    for {
      date <- Clock.currentDateTime.map(_.toLocalDate)
      stage <- ZIO.service[Stage]

      zuoraIds <- ZIO.fromEither(zuoraIdsForStage(config.Stage(stage.toString)))

      supporterPlusRatePlanIds <- ZIO.fromEither(getSupporterPlusRatePlanIds(zuoraIds, billingPeriod))
      chargeOverride = ChargeOverrides(
        price = Some(price),
        productRatePlanChargeId = supporterPlusRatePlanIds.ratePlanChargeId,
      )

      addRatePlan = AddRatePlan(date, supporterPlusRatePlanIds.ratePlanId, chargeOverrides = List(chargeOverride))

      removeRatePlan = RemoveRatePlan(date, ratePlanIdToRemove)
    } yield SubscriptionUpdateRequest(List(addRatePlan), List(removeRatePlan))
}

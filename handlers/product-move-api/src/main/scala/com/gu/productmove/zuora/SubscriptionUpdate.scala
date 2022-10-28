package com.gu.productmove.zuora

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
import zio.{Clock, IO, RIO, Task, UIO, URLayer, ZIO, ZLayer}

import java.time.LocalDate

trait SubscriptionUpdate:
  def update(subscriptionId: String, ratePlanIdToAdd: String, ratePlanIdToRemove: String): ZIO[Any, String, SubscriptionUpdateResponse]

object SubscriptionUpdateLive:
  val layer: URLayer[ZuoraGet, SubscriptionUpdate] = ZLayer.fromFunction(SubscriptionUpdateLive(_))

private class SubscriptionUpdateLive(zuoraGet: ZuoraGet) extends SubscriptionUpdate :
  override def update(subscriptionId: String, ratePlanIdToAdd: String, ratePlanIdToRemove: String): ZIO[Any, String, SubscriptionUpdateResponse] = {
    for {
      requestBody <- SubscriptionUpdateRequest(ratePlanIdToAdd, ratePlanIdToRemove)
      response <- zuoraGet.put[SubscriptionUpdateRequest, SubscriptionUpdateResponse](uri"subscriptions/$subscriptionId", requestBody)
    } yield response
  }

object SubscriptionUpdate {
  def update(subscriptionId: String, ratePlanIdToAdd: String, ratePlanIdToRemove: String): ZIO[SubscriptionUpdate, String, SubscriptionUpdateResponse] =
    ZIO.serviceWithZIO[SubscriptionUpdate](_.update(subscriptionId, ratePlanIdToAdd, ratePlanIdToRemove))
}

case class SubscriptionUpdateResponse(subscriptionId: String)

given JsonDecoder[SubscriptionUpdateResponse] = DeriveJsonDecoder.gen[SubscriptionUpdateResponse]

given JsonEncoder[AddRatePlan] = DeriveJsonEncoder.gen[AddRatePlan]
given JsonEncoder[RemoveRatePlan] = DeriveJsonEncoder.gen[RemoveRatePlan]
given JsonEncoder[SubscriptionUpdateRequest] = DeriveJsonEncoder.gen[SubscriptionUpdateRequest]

case class AddRatePlan(contractEffectiveDate: LocalDate, productRatePlanId: String)
case class RemoveRatePlan(contractEffectiveDate: LocalDate, ratePlanId: String)

case class SubscriptionUpdateRequest(
  add: AddRatePlan,
  remove: RemoveRatePlan,
  collect: Boolean = true,
  runBilling: Boolean = true
)

object SubscriptionUpdateRequest {
  given JsonEncoder[SubscriptionUpdateRequest] = DeriveJsonEncoder.gen[SubscriptionUpdateRequest]

  def apply(ratePlanIdToAdd: String, ratePlanIdToRemove: String): ZIO[Any, Nothing, SubscriptionUpdateRequest] =
    for {
      date <- Clock.currentDateTime.map(_.toLocalDate)

      addRatePlan = AddRatePlan(date, ratePlanIdToAdd)
      removeRatePlan = RemoveRatePlan(date, ratePlanIdToRemove)
    } yield SubscriptionUpdateRequest(addRatePlan, removeRatePlan)
}

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

trait ZuoraSetCancellationReason:
  def update(subscriptionNumber: String, subscriptionVersion: Int, userCancellationReason: String): ZIO[Any, String, UpdateResponse]

object ZuoraSetCancellationReasonLive:
  val layer: URLayer[ZuoraGet, ZuoraSetCancellationReason] = ZLayer.fromFunction(ZuoraSetCancellationReasonLive(_))

private class ZuoraSetCancellationReasonLive(zuoraGet: ZuoraGet) extends ZuoraSetCancellationReason :
  override def update(subscriptionNumber: String, subscriptionVersion: Int, userCancellationReason: String): ZIO[Any, String, UpdateResponse] = {
    val updateRequest = UpdateRequest(CustomFields(userCancellationReason))

    zuoraGet.put[UpdateRequest, UpdateResponse](uri"subscriptions/$subscriptionNumber/versions/$subscriptionVersion/customFields", updateRequest)
  }

object ZuoraSetCancellationReason {
  def update(subscriptionNumber: String, subscriptionVersion: Int, userCancellationReason: String): ZIO[ZuoraSetCancellationReason, String, UpdateResponse] =
    ZIO.serviceWithZIO[ZuoraSetCancellationReason](_.update(subscriptionNumber, subscriptionVersion, userCancellationReason))
}

case class UpdateRequest(
  customFields: CustomFields
)

given JsonEncoder[UpdateRequest] = DeriveJsonEncoder.gen[UpdateRequest]

case class CustomFields(UserCancellationReason__c: String, CancellationReason__c: String = "Customer")

given JsonEncoder[CustomFields] = DeriveJsonEncoder.gen[CustomFields]

case class UpdateResponse(
  success: Boolean
)

given JsonDecoder[UpdateResponse] = DeriveJsonDecoder.gen[UpdateResponse]

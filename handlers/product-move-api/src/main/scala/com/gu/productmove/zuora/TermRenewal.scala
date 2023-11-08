package com.gu.productmove.zuora

import com.gu.i18n.Currency
import com.gu.newproduct.api.productcatalog.PlanId.{AnnualSupporterPlus, MonthlySupporterPlus}
import com.gu.newproduct.api.productcatalog.ZuoraIds.{
  ProductRatePlanId,
  SupporterPlusZuoraIds,
  ZuoraIds,
  zuoraIdsForStage,
}
import com.gu.newproduct.api.productcatalog.*
import com.gu.productmove.AwsS3
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError, PreviewResult}
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.model.{SubscriptionId, SubscriptionName}
import com.gu.productmove.zuora.rest.ZuoraGet
import com.gu.productmove.zuora.rest.ZuoraRestBody.{ZuoraSuccessResultsArray, ZuoraSuccessCheck, ZuoraSuccessLowercase}
import com.gu.util.config
import sttp.capabilities.zio.ZioStreams
import sttp.capabilities.{Effect, WebSockets}
import sttp.client3.*
import sttp.client3.httpclient.zio.HttpClientZioBackend
import sttp.client3.ziojson.*
import sttp.model.Uri
import zio.json.*
import zio.json.ast.Json
import zio.json.internal.Write
import zio.{Clock, IO, RIO, Task, UIO, URLayer, ZIO, ZLayer}

import java.time.LocalDate
import java.time.temporal.ChronoUnit

trait TermRenewal:
  def renewSubscription(
      subscriptionName: SubscriptionName,
      collectPayment: Boolean,
  ): ZIO[Stage with GetSubscription, ErrorResponse, RenewalResponse]

object TermRenewalLive:
  val layer: URLayer[ZuoraGet, TermRenewal] = ZLayer.fromFunction(TermRenewalLive(_))

private class TermRenewalLive(zuoraGet: ZuoraGet) extends TermRenewal:
  /*
  Start a new term for this subscription from today.
  This is to avoid problems with charges not aligning correctly with the term and resulting in unpredictable
  billing dates and amounts.

  Uses https://www.zuora.com/developer/api-references/api/operation/PUT_RenewSubscription/
   */

  override def renewSubscription(
      subscriptionName: SubscriptionName,
      collectPayment: Boolean,
  ): ZIO[Stage with GetSubscription, ErrorResponse, RenewalResponse] = for {
    _ <- ZIO.log(s"Attempting to renew subscription $subscriptionName")
    today <- Clock.currentDateTime.map(_.toLocalDate)
    response <- renewSubscription(subscriptionName, today, collectPayment)
    _ <- ZIO.log(s"Successfully renewed subscription $subscriptionName")
  } yield response

  private def renewSubscription(
      subscriptionName: SubscriptionName,
      contractEffectiveDate: LocalDate,
      collectPayment: Boolean,
  ): ZIO[Stage, ErrorResponse, RenewalResponse] = {
    val requestBody = RenewalRequest(
      contractEffectiveDate,
      collect = if (collectPayment) Some(true) else None,
      runBilling = true,
    )
    zuoraGet
      .put[RenewalRequest, RenewalResponse](
        relativeUrl = uri"subscriptions/${subscriptionName.value}/renew",
        input = requestBody,
        zuoraSuccessCheck = ZuoraSuccessCheck.SuccessCheckLowercase,
      )
  }

object TermRenewal {
  def renewSubscription(
      subscriptionName: SubscriptionName,
      collectPayment: Boolean,
  ): ZIO[TermRenewal with Stage with GetSubscription, ErrorResponse, RenewalResponse] =
    ZIO.serviceWithZIO[TermRenewal](_.renewSubscription(subscriptionName, collectPayment))
}
case class RenewalRequest(
    contractEffectiveDate: LocalDate,
    collect: Option[Boolean],
    runBilling: Boolean,
)
case class RenewalResponse(success: Option[Boolean], invoiceId: Option[String])
object RenewalResponse {
  given JsonDecoder[RenewalResponse] = DeriveJsonDecoder.gen[RenewalResponse]
}
given JsonEncoder[RenewalRequest] = DeriveJsonEncoder.gen[RenewalRequest]

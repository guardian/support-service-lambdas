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
import com.gu.productmove.zuora.model.SubscriptionId
import com.gu.productmove.zuora.rest.ZuoraGet
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
  def update[R: JsonDecoder](
      subscriptionId: SubscriptionId,
      termStartDate: LocalDate,
  ): ZIO[Stage, ErrorResponse, R]

object TermRenewalLive:
  val layer: URLayer[ZuoraGet, TermRenewal] = ZLayer.fromFunction(TermRenewalLive(_))

private class TermRenewalLive(zuoraGet: ZuoraGet) extends TermRenewal:
  override def update[R: JsonDecoder](
      subscriptionId: SubscriptionId,
      termStartDate: LocalDate,
  ): ZIO[Stage, ErrorResponse, R] = {
    val today = LocalDate.now
    val newLength = ChronoUnit.DAYS.between(termStartDate, today).toInt
    val requestBody = AmendTermLengthRequest(
      List(
        AmendmentRequest(
          List(
            Amendment(
              ContractEffectiveDate = today,
              CustomerAcceptanceDate = today,
              SubscriptionId = subscriptionId.value,
              CurrentTerm = newLength,
            ),
          ),
        ),
      ),
    )
    zuoraGet.put[AmendTermLengthRequest, R](
      uri"action/amend",
      requestBody,
    )
  }

object TermRenewal {
  def update[R: JsonDecoder](
      subscriptionId: SubscriptionId,
      termStartDate: LocalDate,
  ): ZIO[TermRenewal with Stage, ErrorResponse, R] =
    ZIO.serviceWithZIO[TermRenewal](_.update[R](subscriptionId, termStartDate))
}
case class AmendmentRequest(Amendments: List[Amendment])
case class Amendment(
    ContractEffectiveDate: LocalDate,
    CustomerAcceptanceDate: LocalDate,
    SubscriptionId: String,
    CurrentTerm: Int,
    CurrentPeriodType: String = "Day",
    Status: String = "Completed",
    Name: String = "Amend current term to end today by product-move-api during switch to Supporter Plus",
    Type: String = "TermsAndConditions",
)
case class AmendTermLengthRequest(
    requests: List[AmendmentRequest],
)
case class AmendmentResponse(results: List[AmendmentResult])
case class AmendmentResult(AmendmentIds: List[String], Success: Boolean)
given JsonEncoder[AmendTermLengthRequest] = DeriveJsonEncoder.gen[AmendTermLengthRequest]
given JsonEncoder[Amendment] = DeriveJsonEncoder.gen[Amendment]
given JsonEncoder[AmendmentRequest] = DeriveJsonEncoder.gen[AmendmentRequest]
given JsonDecoder[AmendmentResult] = DeriveJsonDecoder.gen[AmendmentResult]
given JsonDecoder[AmendmentResponse] = DeriveJsonDecoder.gen[AmendmentResponse]

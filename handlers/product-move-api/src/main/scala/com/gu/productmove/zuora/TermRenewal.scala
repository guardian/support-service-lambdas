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
import com.gu.productmove.zuora.rest.ZuoraRestBody.ZuoraSuccessCheck
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
  def startNewTermFromToday[R: JsonDecoder](
      subscriptionName: SubscriptionName,
  ): ZIO[Stage with GetSubscription, ErrorResponse, R]

object TermRenewalLive:
  val layer: URLayer[ZuoraGet, TermRenewal] = ZLayer.fromFunction(TermRenewalLive(_))

private class TermRenewalLive(zuoraGet: ZuoraGet) extends TermRenewal:
  /*
  Start a new term for this subscription from today.
  This is to avoid problems with charges not aligning correctly with the term and resulting in unpredictable
  billing dates and amounts.

  To do this we need to adjust the current term length so that it ends today using an amend call:
  https://www.zuora.com/developer/api-references/older-api/operation/Action_POSTamend/

  Then renew the subscription using https://www.zuora.com/developer/api-references/api/operation/PUT_RenewSubscription/

  During this process two invoices will be generated - a negative one for the full amount which represents the fact
  that we have reduced the current term to zero days from today's payment and then a positive one for the full amount
  which covers the new 12 month term.

  In order to balance these out, we can use the `applyCreditBalance` parameter in the renewal request.
   */

  override def startNewTermFromToday[R: JsonDecoder](
      subscriptionName: SubscriptionName,
  ): ZIO[Stage with GetSubscription, ErrorResponse, R] = for {
    today <- Clock.currentDateTime.map(_.toLocalDate)
    subscription <- GetSubscription.get(subscriptionName)
    _ <- amendTermEndDateToToday(SubscriptionId(subscription.id), today, subscription.termStartDate)
    response <- renewSubscription(subscriptionName)
  } yield response

  private def amendTermEndDateToToday[R: JsonDecoder](
      subscriptionId: SubscriptionId,
      today: LocalDate,
      termStartDate: LocalDate,
  ): ZIO[Stage, ErrorResponse, R] = {
    val newLength =
      ChronoUnit.DAYS.between(termStartDate, today).toInt
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
      relativeUrl = uri"action/amend",
      input = requestBody,
      zuoraSuccessCheck = ZuoraSuccessCheck.SuccessCheckResultsArray,
    )
  }

  private def renewSubscription[R: JsonDecoder](
      subscriptionName: SubscriptionName,
  ): ZIO[Stage, ErrorResponse, R] = {
    val today = LocalDate.now
    val requestBody = RenewalRequest(today)
    zuoraGet.put[RenewalRequest, R](
      relativeUrl = uri"subscriptions/${subscriptionName.value}/renew",
      input = requestBody,
      zuoraSuccessCheck = ZuoraSuccessCheck.SuccessCheckLowercase,
    )
  }

object TermRenewal {
  def startNewTermFromToday[R: JsonDecoder](
      subscriptionName: SubscriptionName,
  ): ZIO[TermRenewal with Stage with GetSubscription, ErrorResponse, R] =
    ZIO.serviceWithZIO[TermRenewal](_.startNewTermFromToday[R](subscriptionName))
}
case class AmendmentRequest(Amendments: List[Amendment])
case class Amendment(
    ContractEffectiveDate: LocalDate,
    CustomerAcceptanceDate: LocalDate,
    SubscriptionId: String,
    CurrentTerm: Int,
    CurrentTermPeriodType: String = "Day",
    Status: String = "Completed",
    Name: String = "Amend current term to end today by product-move-api during switch to Supporter Plus",
    Type: String = "TermsAndConditions",
)
case class AmendTermLengthRequest(
    requests: List[AmendmentRequest],
)
case class AmendmentResponse(results: List[AmendmentResult])
case class AmendmentResult(AmendmentIds: List[String], Success: Boolean)
case class RenewalRequest(
    contractEffectiveDate: LocalDate,
    applyCreditBalance: Boolean = true, // When we shorten
    runBilling: Boolean = true,
)
case class RenewalResponse(success: Option[Boolean])
given JsonEncoder[AmendTermLengthRequest] = DeriveJsonEncoder.gen[AmendTermLengthRequest]
given JsonEncoder[Amendment] = DeriveJsonEncoder.gen[Amendment]
given JsonEncoder[AmendmentRequest] = DeriveJsonEncoder.gen[AmendmentRequest]
given JsonDecoder[AmendmentResult] = DeriveJsonDecoder.gen[AmendmentResult]
object RenewalResponse {
  given JsonDecoder[RenewalResponse] = DeriveJsonDecoder.gen[RenewalResponse]
}
given JsonEncoder[RenewalRequest] = DeriveJsonEncoder.gen[RenewalRequest]

package com.gu.productmove.endpoint.cancel

import cats.data.NonEmptyList
import com.gu.newproduct.api.productcatalog.ZuoraIds
import com.gu.newproduct.api.productcatalog.ZuoraIds.SupporterPlusZuoraIds
import com.gu.productmove.SecretsLive
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpointTypes.*
import com.gu.productmove.{
  AwsCredentialsLive,
  AwsS3,
  AwsS3Live,
  EmailMessage,
  EmailPayload,
  EmailPayloadCancellationAttributes,
  EmailPayloadContactAttributes,
  GuStageLive,
  SQS,
  SQSLive,
  SttpClientLive,
}
import zio.{Clock, IO, RIO, Task, ZIO}
import com.gu.productmove.framework.{LambdaEndpoint, ZIOApiGatewayRequestHandler}
import com.gu.productmove.invoicingapi.InvoicingApiRefund.RefundResponse
import com.gu.productmove.invoicingapi.{InvoicingApiRefund, InvoicingApiRefundLive}
import com.gu.productmove.zuora.rest.*
import com.gu.productmove.zuora.{
  CreditBalanceAdjustment,
  CreditBalanceAdjustmentLive,
  GetAccount,
  GetAccountLive,
  GetInvoice,
  GetInvoiceLive,
  GetRefundInvoiceDetails,
  GetRefundInvoiceDetailsLive,
  InvoiceItemAdjustment,
  InvoiceItemAdjustmentLive,
  ZuoraCancel,
  ZuoraCancelLive,
  ZuoraSetCancellationReason,
  ZuoraSetCancellationReasonLive,
}
import com.gu.util.config
import sttp.tapir.*
import sttp.tapir.EndpointIO.Example
import sttp.tapir.json.zio.jsonBody
import sttp.client3.SttpBackend
import com.gu.productmove.refund.*
import RefundType.*
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{
  BadRequest,
  ErrorResponse,
  InternalServerError,
  OutputBody,
  Success,
}
import com.gu.productmove.endpoint.zuora.{GetSubscriptionToCancel, GetSubscriptionToCancelLive}
import com.gu.productmove.endpoint.zuora.GetSubscriptionToCancel.{GetSubscriptionToCancelResponse, RatePlanCharge}
import com.gu.productmove.zuora.model.SubscriptionName
import org.joda.time.format.DateTimeFormat

import java.time.LocalDate
import scala.concurrent.Future

// this is the description for just the one endpoint
object SubscriptionCancelEndpoint {
  val server: sttp.tapir.server.ServerEndpoint.Full[
    Unit,
    Unit,
    (String, ExpectedInput),
    Unit,
    OutputBody,
    Any,
    Task,
  ] = {
    val subscriptionNameCapture: EndpointInput.PathCapture[String] =
      EndpointInput.PathCapture[String](
        Some("subscriptionName"),
        implicitly,
        EndpointIO.Info.empty.copy(
          description = Some("Name of subscription to cancel."),
          examples = List(Example("A-S000001", None, None)),
        ),
      )
    val endpointDescription: PublicEndpoint[(String, ExpectedInput), Unit, OutputBody, Any] =
      endpoint.post
        .in("supporter-plus-cancel")
        .in(subscriptionNameCapture)
        .in(
          jsonBody[ExpectedInput].copy(info =
            EndpointIO.Info
              .empty[ExpectedInput]
              .copy(description = Some("Information to describe the nature of the cancellation")),
          ),
        )
        .out(
          oneOf(
            oneOfVariant(
              sttp.model.StatusCode.Ok,
              jsonBody[Success]
                .copy(info = EndpointIO.Info.empty.copy(description = Some("Successfully cancelled the subscription."))),
            ),
            oneOfVariant(
              sttp.model.StatusCode.InternalServerError,
              jsonBody[InternalServerError]
                .copy(info = EndpointIO.Info.empty.copy(description = Some("InternalServerError."))),
            ),
          ),
        )
        .summary("Cancels the subscription at the soonest possible date based on the subscription type.")
        .description(
          """Cancels the existing subscription at the default/soonest date.
            |Also manages all the service comms associated with the cancellation.""".stripMargin,
        )
    endpointDescription.serverLogic[Task](run)
  }

  private def run(subscriptionName: String, postData: ExpectedInput): Task[Right[Nothing, OutputBody]] = for {
    _ <- ZIO.log(s"INPUT: $subscriptionName: $postData")
    res <- subscriptionCancel(SubscriptionName(subscriptionName), postData)
      .provide(
        GetSubscriptionToCancelLive.layer,
        ZuoraCancelLive.layer,
        AwsCredentialsLive.layer,
        SttpClientLive.layer,
        ZuoraClientLive.layer,
        ZuoraGetLive.layer,
        GuStageLive.layer,
        ZuoraSetCancellationReasonLive.layer,
        GetAccountLive.layer,
        SQSLive.layer,
        SecretsLive.layer,
      )
      .tapEither(result => ZIO.log(s"OUTPUT: $subscriptionName: " + result))
  } yield Right(res)

  def asSingle[A](list: List[A], message: String): IO[ErrorResponse, A] =
    list match {
      case singlePlan :: Nil => ZIO.succeed(singlePlan)
      case wrongNumber =>
        ZIO.fail(
          InternalServerError(
            s"Subscription can't be cancelled as we didn't have a single $message: ${wrongNumber.length}: $wrongNumber",
          ),
        )
    }

  def asNonEmptyList[A](list: List[A], message: String): IO[ErrorResponse, NonEmptyList[A]] =
    NonEmptyList.fromList(list) match {
      case Some(nel) => ZIO.succeed(nel)
      case None => ZIO.fail(InternalServerError(message))
    }

  private def getSupporterPlusCharge(
      charges: NonEmptyList[RatePlanCharge],
      ids: SupporterPlusZuoraIds,
  ): ZIO[Any, ErrorResponse, RatePlanCharge] = {
    val supporterPlusCharge = charges.find(charge =>
      charge.productRatePlanChargeId == ids.annual.productRatePlanChargeId.value ||
        charge.productRatePlanChargeId == ids.monthly.productRatePlanChargeId.value ||
        charge.productRatePlanChargeId == ids.monthlyV2.productRatePlanChargeId.value ||
        charge.productRatePlanChargeId == ids.annualV2.productRatePlanChargeId.value,
    )
    supporterPlusCharge
      .map(ZIO.succeed(_))
      .getOrElse(
        ZIO.fail(InternalServerError("Subscription cannot be cancelled as it was not a Supporter Plus subscription")),
      )
  }

  private def subIsWithinFirst14Days(now: LocalDate, contractEffectiveDate: LocalDate) =
    now.isBefore(contractEffectiveDate.plusDays(15)) // This is 14 days from the day after the sub was taken out

  private[productmove] def subscriptionCancel(subscriptionName: SubscriptionName, postData: ExpectedInput): RIO[
    GetSubscriptionToCancel with ZuoraCancel with GetAccount with SQS with Stage with ZuoraSetCancellationReason,
    OutputBody,
  ] = {
    (for {
      _ <- ZIO.log(s"PostData: ${postData.toString}")
      stage <- ZIO.service[Stage]
      _ <- ZIO.log(s"Stage is $stage")
      subscription <- GetSubscriptionToCancel.get(subscriptionName)
      _ <- ZIO.log(s"Subscription is $subscription")

      _ <- subscription.status match {
        case "Active" => ZIO.succeed(())
        case _ => ZIO.fail(BadRequest(s"Subscription $subscriptionName cannot be cancelled as it is not active"))
      }

      // check sub info to make sure it's a supporter plus subscription
      zuoraIds <- ZIO
        .fromEither(ZuoraIds.zuoraIdsForStage(config.Stage(stage.toString)).left.map(InternalServerError.apply))
      // We have fetched the subscription with the charge-detail=current-segment query param described here:
      // https://developer.zuora.com/api-references/api/operation/GET_SubscriptionsByKey/#!in=query&path=charge-detail&t=request
      // this means that only the currently active rate plan will contain charge information (even if it has a
      // lastChangeType of 'Remove')
      ratePlan <- asSingle(subscription.ratePlans.filter(_.ratePlanCharges.nonEmpty), "ratePlan")
      charges <- asNonEmptyList(
        ratePlan.ratePlanCharges,
        s"Subscription can't be cancelled as the charge list is empty",
      )
      supporterPlusCharge <- getSupporterPlusCharge(charges, zuoraIds.supporterPlusZuoraIds)

      today <- Clock.currentDateTime.map(_.toLocalDate)

      // check whether the sub is within the first 14 days of purchase - if it is then the subscriber is entitled to a refund
      shouldBeRefunded = subIsWithinFirst14Days(today, supporterPlusCharge.effectiveStartDate)
      _ <- ZIO.log(s"Should be refunded is $shouldBeRefunded")

      cancellationDate <- ZIO
        .fromOption(
          if (shouldBeRefunded)
            Some(supporterPlusCharge.effectiveStartDate)
          else
            supporterPlusCharge.chargedThroughDate,
        )
        .orElseFail(
          InternalServerError(
            s"Subscription charged through date is null for supporter plus subscription ${subscriptionName.value}. " +
              s"This is an error because we expect to be able to use the charged through date to work out the effective cancellation date",
          ),
        )
      _ <- ZIO.log(s"Cancellation date is $cancellationDate")

      _ <- ZIO.log(s"Attempting to cancel sub")
      cancellationResponse <- ZuoraCancel.cancel(subscriptionName, cancellationDate)
      _ <- ZIO.log("Sub cancelled as of: " + cancellationDate)

      _ <-
        if (shouldBeRefunded)
          for {
            _ <- ZIO.log(s"Attempting to refund sub")
            negativeInvoice <- ZIO
              .fromOption(cancellationResponse.invoiceId)
              .orElseFail(
                InternalServerError(
                  s"URGENT: subscription ${subscriptionName.value} should be refunded but has no negative invoice attached.",
                ),
              )
            _ <- ZIO.log(s"Negative invoice id is $negativeInvoice")
            _ <- SQS.queueRefund(RefundInput(subscriptionName))
          } yield ()
        else ZIO.succeed(RefundResponse("Success", ""))

      _ <- ZIO.log(s"Attempting to update cancellation reason on Zuora subscription")
      _ <- ZuoraSetCancellationReason
        .update(
          subscriptionName,
          subscription.version + 1,
          postData.reason,
        ) // Version +1 because the cancellation will have incremented the version
      account <- GetAccount.get(subscription.accountNumber)
      _ <- SQS.sendEmail(EmailMessage.cancellationEmail(account, cancellationDate))
    } yield ()).fold(
      error => error,
      _ => Success(s"Subscription ${subscriptionName.value} was successfully cancelled"),
    )
  }

}

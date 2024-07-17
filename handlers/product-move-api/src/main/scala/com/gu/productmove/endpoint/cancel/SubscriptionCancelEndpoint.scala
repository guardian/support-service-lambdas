package com.gu.productmove.endpoint.cancel

import cats.data.NonEmptyList
import com.gu.productmove.{
  AwsCredentialsLive,
  AwsS3,
  AwsS3Live,
  EmailMessage,
  EmailPayload,
  EmailPayloadCancellationAttributes,
  EmailPayloadContactAttributes,
  GuStageLive,
  IdentityId,
  SQS,
  SQSLive,
  SecretsLive,
  SttpClientLive,
}
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpointTypes.*
import zio.{Cause, Clock, IO, RIO, Task, ZIO}
import com.gu.productmove.framework.{LambdaEndpoint, ZIOApiGatewayRequestHandler}
import com.gu.productmove.invoicingapi.InvoicingApiRefund.RefundResponse
import com.gu.productmove.invoicingapi.{InvoicingApiRefund, InvoicingApiRefundLive}
import com.gu.productmove.zuora.rest.*
import com.gu.productmove.zuora.{
  CancellationResponse,
  CreditBalanceAdjustment,
  CreditBalanceAdjustmentLive,
  GetAccount,
  GetAccountLive,
  GetInvoice,
  GetInvoiceLive,
  GetRefundInvoiceDetails,
  GetRefundInvoiceDetailsLive,
  GetSubscription,
  GetSubscriptionLive,
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
import com.gu.newproduct.api.productcatalog.ZuoraIds
import com.gu.newproduct.api.productcatalog.ZuoraIds.SupporterPlusZuoraIds
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{BadRequest, InternalServerError, OutputBody, Success}
import com.gu.productmove.endpoint.zuora.{GetSubscriptionToCancel, GetSubscriptionToCancelLive}
import com.gu.productmove.endpoint.zuora.GetSubscriptionToCancel.{GetSubscriptionToCancelResponse, RatePlanCharge}
import com.gu.productmove.zuora.model.SubscriptionName
import org.joda.time.format.DateTimeFormat

import java.time.LocalDate
import scala.concurrent.Future

// this is the description for just the one endpoint
object SubscriptionCancelEndpoint {

  // run this to test locally via console with some hard coded data
  def main(args: Array[String]): Unit = LambdaEndpoint.runTest(
    run(
      "A-S00878246",
      ExpectedInput(
        "mma_value_for_money", // valid pick list value
      ),
      IdentityId("200235444"),
    ),
  )

  val server: sttp.tapir.server.ServerEndpoint.Full[
    Unit,
    Unit,
    (String, ExpectedInput, IdentityId),
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
    val endpointDescription: PublicEndpoint[(String, ExpectedInput, IdentityId), Unit, OutputBody, Any] =
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
        .in(header[IdentityId]("x-identity-id"))
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
            oneOfVariant(
              sttp.model.StatusCode.BadRequest,
              jsonBody[BadRequest]
                .copy(info = EndpointIO.Info.empty.copy(description = Some("Bad request."))),
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

  private def run(
      subscriptionName: String,
      postData: ExpectedInput,
      identityId: IdentityId,
  ): Task[Right[Nothing, OutputBody]] = (for {
    _ <- ZIO.log(s"INPUT: $subscriptionName $identityId: $postData")
    getSubscription <- ZIO.service[GetSubscription]
    getAccount <- ZIO.service[GetAccount]
    getSubscriptionToCancel <- ZIO.service[GetSubscriptionToCancel]
    zuoraCancel <- ZIO.service[ZuoraCancel]
    sqs <- ZIO.service[SQS]
    stage <- ZIO.service[Stage]
    zuoraSetCancellationReason <- ZIO.service[ZuoraSetCancellationReason]
    res <- new SubscriptionCancelEndpointSteps(
      getSubscription,
      getAccount,
      getSubscriptionToCancel,
      zuoraCancel,
      sqs,
      stage,
      zuoraSetCancellationReason,
    ).subscriptionCancel(SubscriptionName(subscriptionName), postData, identityId)
      .tapEither(result => ZIO.log(s"OUTPUT: $subscriptionName: " + result))
  } yield Right(res))
    .provide(
      GetSubscriptionToCancelLive.layer,
      GetSubscriptionLive.layer,
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
}

package com.gu.productmove.endpoint.updateamount

import cats.data.NonEmptyList
import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import com.gu.supporterdata.model.SupporterRatePlanItem
import com.gu.productmove.SecretsLive
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{
  BadRequest,
  ErrorResponse,
  InternalServerError,
  OutputBody,
  Success,
}
import com.gu.productmove.GuStageLive.Stage
import zio.Task
import com.gu.productmove.framework.{LambdaEndpoint, ZIOApiGatewayRequestHandler}
import com.gu.productmove.refund.RefundInput
import com.gu.productmove.salesforce.Salesforce.SalesforceRecordInput
import com.gu.productmove.zuora.GetSubscription.RatePlanCharge
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGet, ZuoraGetLive}
import com.gu.util.config
import com.gu.productmove.zuora.{
  ChargeUpdateDetails,
  GetAccount,
  GetAccountLive,
  GetInvoiceItems,
  GetInvoiceItemsLive,
  GetSubscription,
  GetSubscriptionLive,
  InvoiceItemAdjustment,
  InvoiceItemAdjustmentLive,
  Subscribe,
  SubscribeLive,
  SubscriptionUpdate,
  SubscriptionUpdateLive,
  SubscriptionUpdateRequest,
  SubscriptionUpdateResponse,
  UpdateSubscriptionAmount,
  UpdateSubscriptionAmountItem,
  ZuoraCancel,
  ZuoraCancelLive,
}
import com.gu.productmove.{
  AwsCredentialsLive,
  AwsS3Live,
  Dynamo,
  DynamoLive,
  EmailMessage,
  EmailPayload,
  EmailPayloadContactAttributes,
  GuStageLive,
  SQS,
  SQSLive,
  SttpClientLive,
}
import sttp.tapir.*
import sttp.tapir.EndpointIO.Example
import sttp.tapir.Schema
import sttp.tapir.json.zio.jsonBody
import zio.*
import zio.json.*
import com.gu.newproduct.api.productcatalog.ZuoraIds
import com.gu.newproduct.api.productcatalog.ZuoraIds.SupporterPlusZuoraIds
import com.gu.productmove.endpoint.available.Currency

import java.time.format.DateTimeFormatter
import com.gu.productmove.endpoint.updateamount.UpdateSupporterPlusAmountEndpointTypes.ExpectedInput
import com.gu.productmove.zuora.model.SubscriptionName

import scala.collection.immutable

// this is the description for just the one endpoint
object UpdateSupporterPlusAmountEndpoint {

  val server: sttp.tapir.server.ServerEndpoint.Full[
    Unit,
    Unit,
    (String, ExpectedInput),
    Unit,
    OutputBody,
    Any,
    Task,
  ] = {
    val subscriptionNameCapture: EndpointInput.PathCapture[String] = {
      EndpointInput.PathCapture[String](
        Some("subscriptionName"),
        implicitly,
        EndpointIO.Info.empty.copy(
          description = Some("Name of supporter plus subscription to have its contribution amount updated."),
          examples = List(Example("A-S000001", None, None)),
        ), // A-S000001
      )
    }

    val endpointDescription: PublicEndpoint[
      (String, ExpectedInput),
      Unit,
      OutputBody,
      Any,
    ] =
      endpoint.post
        .in("update-supporter-plus-amount")
        .in(subscriptionNameCapture)
        .in(
          jsonBody[ExpectedInput].copy(info =
            EndpointIO.Info
              .empty[ExpectedInput]
              .copy(description = Some("Definition of the updated total amount of regular payment")),
          ),
        )
        .out(
          oneOf(
            oneOfVariant(
              sttp.model.StatusCode.Ok,
              jsonBody[Success].copy(info = EndpointIO.Info.empty.copy(description = Some("Update Success."))),
            ),
            oneOfVariant(
              sttp.model.StatusCode.InternalServerError,
              jsonBody[InternalServerError]
                .copy(info = EndpointIO.Info.empty.copy(description = Some("InternalServerError."))),
            ),
          ),
        )
        .summary("Updates the price of the supporter plus subscription.")
        .description(
          """Updates the charge amount on the contribution rate plan charge of a supporter plus subscription.""".stripMargin,
        )
    endpointDescription.serverLogic[Task](run)
  }

  // run this to test locally via console with some hard coded data
  def main(args: Array[String]): Unit = LambdaEndpoint.runTest(
    run(
      "A-S00609043",
      ExpectedInput(BigDecimal(20)),
    ),
  )

  private def run(subscriptionName: String, postData: ExpectedInput): Task[Right[Nothing, OutputBody]] = for {
    _ <- ZIO.log(s"INPUT: $subscriptionName: $postData")
    res <- UpdateSupporterPlusAmountSteps
      .subscriptionUpdateAmount(SubscriptionName(subscriptionName), postData)
      .provide(
        AwsCredentialsLive.layer,
        SttpClientLive.layer,
        ZuoraClientLive.layer,
        ZuoraGetLive.layer,
        GuStageLive.layer,
        GetAccountLive.layer,
        SQSLive.layer,
        SecretsLive.layer,
        GetSubscriptionLive.layer,
        SubscriptionUpdateLive.layer,
      )
      .tapEither(result => ZIO.log(s"OUTPUT: $subscriptionName: " + result))
  } yield Right(res)

}

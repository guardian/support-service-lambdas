package com.gu.productmove.endpoint.move

import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import com.gu.supporterdata.model.SupporterRatePlanItem
import com.gu.productmove.SecretsLive
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.*
import com.gu.productmove.GuStageLive.Stage
import zio.Task
import com.gu.productmove.framework.{LambdaEndpoint, ZIOApiGatewayRequestHandler}
import com.gu.productmove.refund.RefundInput
import com.gu.productmove.salesforce.Salesforce.SalesforceRecordInput
import com.gu.productmove.zuora.GetSubscription.RatePlanCharge
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGet, ZuoraGetLive}
import com.gu.productmove.zuora.{
  CreatePaymentLive,
  GetAccount,
  GetAccountLive,
  GetInvoiceItems,
  GetInvoiceItemsLive,
  GetInvoiceLive,
  GetSubscription,
  GetSubscriptionLive,
  InvoiceItemAdjustment,
  InvoiceItemAdjustmentLive,
  Subscribe,
  SubscribeLive,
  SubscriptionUpdate,
  SubscriptionUpdateLive,
  TermRenewal,
  TermRenewalLive,
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
import com.gu.newproduct.api.productcatalog.ZuoraIds.ZuoraIds

import java.time.format.DateTimeFormatter
import com.gu.i18n.Currency
import com.gu.productmove.zuora.model.SubscriptionName

// this is the description for just the one endpoint
object ProductMoveEndpoint {

  // run this to test locally via console with some hard coded data
  def main(args: Array[String]): Unit = LambdaEndpoint.runTest(
    run(
      SubscriptionName("A-S00448793"),
      SwitchType.RecurringContributionToSupporterPlus,
      ExpectedInput(1, false, None, None),
    ),
  )

  val server: sttp.tapir.server.ServerEndpoint.Full[
    Unit,
    Unit,
    (String, String, ProductMoveEndpointTypes.ExpectedInput),
    Unit,
    ProductMoveEndpointTypes.OutputBody,
    Any,
    Task,
  ] = {
    val subscriptionNameCapture: EndpointInput.PathCapture[String] = {
      EndpointInput.PathCapture[String](
        Some("subscriptionName"),
        implicitly,
        EndpointIO.Info.empty.copy(
          description = Some("Name of subscription to be moved to a different product."),
          examples = List(Example("A-S000001", None, None)),
        ), // A-S000001
      )
    }

    val switchTypeCapture: EndpointInput.PathCapture[String] = {
      EndpointInput.PathCapture[String](
        Some("switchType"),
        implicitly,
        EndpointIO.Info.empty.copy(
          description = Some("Switch type."),
          examples = List(
            Example("recurring-contribution-to-supporter-plus", None, None),
            Example("to-recurring-contribution", None, None),
          ),
        ), // A-S000001
      )
    }

    val endpointDescription: PublicEndpoint[
      (String, String, ProductMoveEndpointTypes.ExpectedInput),
      Unit,
      ProductMoveEndpointTypes.OutputBody,
      Any,
    ] =
      endpoint.post
        .in("product-move")
        .in(switchTypeCapture)
        .in(subscriptionNameCapture)
        .in(
          jsonBody[ExpectedInput].copy(info =
            EndpointIO.Info.empty[ExpectedInput].copy(description = Some("Definition of required movement.")),
          ),
        )
        .out(
          oneOf(
            oneOfVariant(
              sttp.model.StatusCode.Ok,
              jsonBody[Success].copy(info = EndpointIO.Info.empty.copy(description = Some("Update Success."))),
            ),
            oneOfVariant(
              sttp.model.StatusCode.Ok,
              jsonBody[PreviewResult].copy(info = EndpointIO.Info.empty.copy(description = Some("Preview result."))),
            ),
            oneOfVariant(
              sttp.model.StatusCode.InternalServerError,
              jsonBody[InternalServerError]
                .copy(info = EndpointIO.Info.empty.copy(description = Some("InternalServerError."))),
            ),
            oneOfVariant(
              sttp.model.StatusCode.BadRequest,
              jsonBody[BadRequest]
                .copy(info = EndpointIO.Info.empty.copy(description = Some("BadRequest."))),
            ),
            oneOfVariant(
              TransactionErrorStatusCode,
              jsonBody[TransactionError]
                .copy(info = EndpointIO.Info.empty.copy(description = Some("TransactionError."))),
            ),
          ),
        )
        .summary("Replaces the existing subscription with a new one.")
        .description(
          """Cancels the existing subscription and replaces it with a new subscription
            |to a different type of product.
            |Also manages all the service comms associated with the movement.""".stripMargin,
        )
    endpointDescription
      .serverLogic[Task] { (switchTypeStr, subscriptionName, postData) =>
        SwitchType.fromId(switchTypeStr) match {
          case Some(switchType) =>
            run(SubscriptionName(subscriptionName), switchType, postData)
              .tapEither(result => ZIO.log("result tapped: " + result))
              .map(Right.apply)
          case _ =>
            ZIO.succeed(Right(BadRequest(s"Invalid switchType: $switchTypeStr")))
        }
      }
  }

  enum SwitchType(val id: String) {
    case RecurringContributionToSupporterPlus extends SwitchType("recurring-contribution-to-supporter-plus")
    case ToRecurringContribution extends SwitchType("to-recurring-contribution")
  }

  object SwitchType {
    def fromId(id: String): Option[SwitchType] =
      SwitchType.values.find(_.id == id)
  }
  private[productmove] def run(
      subscriptionName: SubscriptionName,
      switchType: SwitchType,
      postData: ExpectedInput,
  ): Task[OutputBody] =
    (switchType match {
      case SwitchType.RecurringContributionToSupporterPlus =>
        RecurringContributionToSupporterPlus(subscriptionName, postData)
      case SwitchType.ToRecurringContribution =>
        ToRecurringContribution(subscriptionName, postData)
    }).provide(
      GetSubscriptionLive.layer,
      AwsCredentialsLive.layer,
      SttpClientLive.layer,
      ZuoraClientLive.layer,
      ZuoraGetLive.layer,
      SubscriptionUpdateLive.layer,
      TermRenewalLive.layer,
      SQSLive.layer,
      GetAccountLive.layer,
      InvoiceItemAdjustmentLive.layer,
      GuStageLive.layer,
      DynamoLive.layer,
      GetInvoiceItemsLive.layer,
      GetInvoiceLive.layer,
      CreatePaymentLive.layer,
      SecretsLive.layer,
    )
}

extension (billingPeriod: BillingPeriod)
  def value: IO[ErrorResponse, String] =
    billingPeriod match {
      case Monthly => ZIO.succeed("month")
      case Annual => ZIO.succeed("annual")
      case _ => ZIO.fail(InternalServerError(s"Unrecognised billing period $billingPeriod"))
    }

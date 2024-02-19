package com.gu.productmove.endpoint.move

import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{
  BadRequest,
  ExpectedInput,
  InternalServerError,
  OutputBody,
  PreviewResult,
  Success,
  TransactionError,
  TransactionErrorStatusCode,
}
import com.gu.productmove.{
  AwsCredentialsLive,
  AwsS3Live,
  Dynamo,
  DynamoLive,
  GuStageLive,
  IdentityId,
  SQS,
  SQSLive,
  SecretsLive,
  SttpClientLive,
}
import com.gu.productmove.endpoint.move.switchtype.{
  GetRatePlans,
  RecurringContributionToSupporterPlusImpl,
  ToRecurringContributionImpl,
}
import com.gu.productmove.framework.LambdaEndpoint
import com.gu.productmove.zuora.*
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.rest.ZuoraRestBody.ZuoraClientError
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGet, ZuoraGetLive}
import sttp.tapir.*
import sttp.tapir.Codec.PlainCodec
import sttp.tapir.EndpointIO.Example
import sttp.tapir.json.zio.jsonBody
import zio.*
import zio.json.*

// this is the description for just the one endpoint
object ProductMoveEndpoint {

  // run this to test locally via console with some hard coded data
  def main(args: Array[String]): Unit = LambdaEndpoint.runTest(
    run(
      SwitchType.RecurringContributionToSupporterPlus,
      SubscriptionName("A-S00448793"),
      ExpectedInput(1, false, None, None),
      None,
    ),
  )

  val server: sttp.tapir.server.ServerEndpoint.Full[
    Unit,
    Unit,
    (SwitchType, SubscriptionName, ProductMoveEndpointTypes.ExpectedInput, Option[IdentityId]),
    Unit,
    ProductMoveEndpointTypes.OutputBody,
    Any,
    Task,
  ] = {
    val subscriptionNameCapture: EndpointInput.PathCapture[SubscriptionName] = {
      EndpointInput.PathCapture[SubscriptionName](
        Some("subscriptionName"),
        implicitly,
        EndpointIO.Info.empty.copy(
          description = Some("Name of subscription to be moved to a different product."),
          examples = List(Example(SubscriptionName("A-S000001"), None, None)),
        ), // A-S000001
      )
    }

    given PlainCodec[SwitchType] =
      Codec.derivedEnumeration[String, SwitchType](
        id => SwitchType.values.find(_.id == id),
        _.id,
      )

    val switchTypeCapture: EndpointInput.PathCapture[SwitchType] = {
      EndpointInput.PathCapture[SwitchType](
        Some("switchType"),
        implicitly,
        EndpointIO.Info.empty.copy(
          description = Some("Switch type."),
          examples = List(
            Example(SwitchType.RecurringContributionToSupporterPlus, None, None),
            Example(SwitchType.ToRecurringContribution, None, None),
          ),
        ), // A-S000001
      )
    }

    val endpointDescription: PublicEndpoint[
      (SwitchType, SubscriptionName, ProductMoveEndpointTypes.ExpectedInput, Option[IdentityId]),
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
        .in(header[Option[IdentityId]]("x-identity-id"))
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
    endpointDescription.serverLogic[Task](run)
  }

  enum SwitchType(val id: String) {
    case RecurringContributionToSupporterPlus extends SwitchType("recurring-contribution-to-supporter-plus")
    case ToRecurringContribution extends SwitchType("to-recurring-contribution")
  }

  private[productmove] def run(
      switchType: SwitchType,
      subscriptionName: SubscriptionName,
      postData: ExpectedInput,
      maybeIdentityId: Option[IdentityId],
  ): Task[Right[Nothing, OutputBody]] =
    val stage = GuStageLive.get
    val getCatalogueLive = new GetCatalogueLive(
      AwsS3Live(AwsS3Live.impl(AwsCredentialsLive.impl)),
      stage,
    )
    val creds = AwsCredentialsLive.impl
    (for {
      sttpClient <- SttpClientLive.impl
      subscriptionUpdate <- ZIO
        .service[SubscriptionUpdate] // TODO convert the rest of the custom layers into normal params
      zuoraGet <- ZIO.service[ZuoraGet]
      getInvoiceItems <- ZIO.service[GetInvoiceItems]
      getInvoice <- ZIO.service[GetInvoice]
      createPayment <- ZIO.service[CreatePayment]
      invoiceItemAdjustment <- ZIO.service[InvoiceItemAdjustment]
      getSubscription <- ZIO.service[GetSubscription]
      getAccount <- ZIO.service[GetAccount]
      sqs <- ZIO.service[SQS]
      dynamo <- ZIO.service[Dynamo]
      productMoveEndpoint = new ProductMoveEndpointSteps(
        new RecurringContributionToSupporterPlusImpl(
          new GetRatePlans(
            stage,
            getCatalogueLive,
          ),
          subscriptionUpdate,
          TermRenewalLive(zuoraGet),
          getInvoiceItems,
          getInvoice,
          createPayment,
          invoiceItemAdjustment,
          sqs,
          dynamo,
        ),
        new ToRecurringContributionImpl(
          new SubscriptionUpdateLive(
            new ZuoraGetLive(ZuoraClientLive.impl(SecretsLive.impl(creds, stage), sttpClient).get),
          ),
          SQSLive.impl(stage, creds).get,
          stage,
        ),
        getSubscription,
        getAccount,
      )
      result <- productMoveEndpoint.runWithLayers(switchType, subscriptionName, postData, maybeIdentityId)
    } yield Right(result))
      .provide(
        GetSubscriptionLive.layer,
        AwsCredentialsLive.layer,
        SttpClientLive.layer,
        ZuoraClientLive.layer,
        ZuoraGetLive.layer,
        SubscriptionUpdateLive.layer,
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

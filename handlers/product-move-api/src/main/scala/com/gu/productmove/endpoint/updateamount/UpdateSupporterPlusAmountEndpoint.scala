package com.gu.productmove.endpoint.updateamount

import cats.data.NonEmptyList
import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import com.gu.supporterdata.model.SupporterRatePlanItem
import com.gu.productmove.SecretsLive
import com.gu.productmove.endpoint.updateamount.UpdateSupporterPlusAmountEndpointTypes.*
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.framework.ZIOApiGatewayRequestHandler.TIO
import com.gu.productmove.framework.{LambdaEndpoint, ZIOApiGatewayRequestHandler}
import com.gu.productmove.refund.RefundInput
import com.gu.productmove.salesforce.Salesforce.SalesforceRecordInput
import com.gu.productmove.zuora.GetSubscription.RatePlanCharge
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGet, ZuoraGetLive}
import com.gu.util.config
import com.gu.util.config.ZuoraEnvironment
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
import com.gu.newproduct.api.productcatalog.PricesFromZuoraCatalog
import com.gu.util.config.ZuoraEnvironment
import com.gu.effects.GetFromS3
import com.gu.newproduct.api.productcatalog.ZuoraIds
import com.gu.newproduct.api.productcatalog.ZuoraIds.SupporterPlusZuoraIds

import java.time.format.DateTimeFormatter
import com.gu.i18n.Currency
import com.gu.productmove.zuora.model.SubscriptionName

// this is the description for just the one endpoint
object UpdateSupporterPlusAmountEndpoint {

  // run this to test locally via console with some hard coded data
  def main(args: Array[String]): Unit = LambdaEndpoint.runTest(
    run(
      "A-S00448793",
      ExpectedInput(BigDecimal(20)),
    ),
  )

  val server: sttp.tapir.server.ServerEndpoint.Full[
    Unit,
    Unit,
    (String, UpdateSupporterPlusAmountEndpointTypes.ExpectedInput),
    Unit,
    UpdateSupporterPlusAmountEndpointTypes.OutputBody,
    Any,
    ZIOApiGatewayRequestHandler.TIO,
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

    val endpointDescription: PublicEndpoint[
      (String, UpdateSupporterPlusAmountEndpointTypes.ExpectedInput),
      Unit,
      UpdateSupporterPlusAmountEndpointTypes.OutputBody,
      Any,
    ] =
      endpoint.post
        .in("update-supporter-plus-amount")
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
    endpointDescription.serverLogic[TIO](run)
  }

  private def run(subscriptionName: String, postData: ExpectedInput): TIO[Right[Nothing, OutputBody]] = for {
    _ <- ZIO.log(s"INPUT: $subscriptionName: $postData")
    res <- subscriptionCancel(SubscriptionName(subscriptionName), postData)
      .provide(
        AwsCredentialsLive.layer,
        SttpClientLive.layer,
        ZuoraClientLive.layer,
        ZuoraGetLive.layer,
        GuStageLive.layer,
        GetAccountLive.layer,
        SQSLive.layer,
        SecretsLive.layer,
      )
      .tapEither(result => ZIO.log(s"OUTPUT: $subscriptionName: " + result))
  } yield Right(res)

  private def getSupporterPlusCharge(
      charges: NonEmptyList[RatePlanCharge],
      ids: SupporterPlusZuoraIds,
  ): ZIO[Any, ErrorResponse, RatePlanCharge] = {
    val supporterPlusCharge = charges.find(charge =>
      charge.productRatePlanChargeId == ids.annual.productRatePlanChargeId.value ||
        charge.productRatePlanChargeId == ids.monthly.productRatePlanChargeId.value ||
        charge.productRatePlanChargeId == ids.monthlyV2.contributionProductRatePlanChargeId.value ||
        charge.productRatePlanChargeId == ids.annualV2.contributionProductRatePlanChargeId.value,
    )
    supporterPlusCharge
      .map(ZIO.succeed(_))
      .getOrElse(
        ZIO.fail(InternalServerError("Supporter Plus rate plan charge not found on subscription")),
      )
  }

  def asSingle[A](list: List[A], message: String): IO[ErrorResponse, A] =
    list match {
      case singlePlan :: Nil => ZIO.succeed(singlePlan)
      case wrongNumber =>
        ZIO.fail(
          InternalServerError(
            s"Subscription can't be updated as we didn't have a single $message: ${wrongNumber.length}: $wrongNumber",
          ),
        )
    }

  def asNonEmptyList[A](list: List[A], message: String): IO[ErrorResponse, NonEmptyList[A]] =
    NonEmptyList.fromList(list) match {
      case Some(nel) => ZIO.succeed(nel)
      case None => ZIO.fail(InternalServerError(s"Subscription can't be updated as the charge list is empty"))
    }

  private[productmove] def subscriptionCancel(subscriptionName: SubscriptionName, postData: ExpectedInput): ZIO[
    GetSubscription with GetAccount with SubscriptionUpdate with SQS with Stage,
    ErrorResponse,
    OutputBody,
  ] = {
    (for {
      _ <- ZIO.log(s"PostData: ${postData.toString}")
      stage <- ZIO.service[Stage]
      _ <- ZIO.log(s"Stage is $stage")

      subscription <- GetSubscription.get(subscriptionName)
      accountFuture <- GetAccount.get(subscription.accountNumber).fork

      _ <- ZIO.log(s"Subscription is $subscription")

      zuoraIds <- ZIO
        .fromEither(
          ZuoraIds.zuoraIdsForStage(config.Stage(stage.toString)).left.map(InternalServerError(_)),
        )

      ratePlan <- asSingle(subscription.ratePlans.filterNot(_.lastChangeType.contains("Remove")), "ratePlan")
      charges <- asNonEmptyList(ratePlan.ratePlanCharges, "ratePlanCharge")
      supporterPlusCharge <- getSupporterPlusCharge(charges, zuoraIds.supporterPlusZuoraIds)

      applyFromDate = supporterPlusCharge.chargedThroughDate.getOrElse(supporterPlusCharge.effectiveStartDate)

      updateRequestBody = UpdateSubscriptionAmount(
        List(
          UpdateSubscriptionAmountItem(
            applyFromDate,
            applyFromDate,
            applyFromDate,
            ratePlan.id,
            List(
              ChargeUpdateDetails(
                price = postData.newPaymentAmount,
                ratePlanChargeId = supporterPlusCharge.productRatePlanChargeId,
              ),
            ),
          ),
        ),
      )
      _ <- SubscriptionUpdate
        .update[SubscriptionUpdateResponse](SubscriptionName(subscription.id), updateRequestBody)

      billingPeriod <- supporterPlusCharge.billingPeriod.value

      account <- accountFuture.join
      _ <- SQS.sendEmail(
        EmailMessage.updateAmountEmail(
          account,
          postData.newPaymentAmount,
          account.basicInfo.currency,
          billingPeriod + "ly",
          applyFromDate,
        ),
      )
    } yield Success(
      s"Successfully updated payment amount for Supporter Plus subscription ${subscriptionName.value} with amount ${postData.newPaymentAmount}",
    )).fold(error => error, success => success)
  }
}

given JsonDecoder[SubscriptionUpdateResponse] = DeriveJsonDecoder.gen[SubscriptionUpdateResponse]

extension (billingPeriod: BillingPeriod)
  def value: IO[ErrorResponse, String] =
    billingPeriod match {
      case Monthly => ZIO.succeed("month")
      case Annual => ZIO.succeed("annual")
      case _ => ZIO.fail(InternalServerError(s"Unrecognised billing period $billingPeriod"))
    }

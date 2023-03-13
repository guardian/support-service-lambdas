package com.gu.productmove.endpoint.move

import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly}
import com.gu.supporterdata.model.SupporterRatePlanItem

import java.time.LocalDate
import scala.concurrent.ExecutionContext.Implicits.global
import com.gu.productmove.endpoint.available.{Billing, Currency, MoveToProduct, Offer, TimePeriod, TimeUnit, Trial}
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.*
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.framework.ZIOApiGatewayRequestHandler.TIO
import com.gu.productmove.framework.{LambdaEndpoint, ZIOApiGatewayRequestHandler}
import com.gu.productmove.refund.RefundInput
import com.gu.productmove.salesforce.Salesforce.SalesforceRecordInput
import com.gu.productmove.zuora.GetSubscription.RatePlanCharge
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGet, ZuoraGetLive}
import com.gu.productmove.zuora.{
  GetAccount,
  GetAccountLive,
  GetSubscription,
  GetSubscriptionLive,
  Subscribe,
  SubscribeLive,
  SubscriptionUpdate,
  getSupporterPlusRatePlanIds,
  SubscriptionUpdateLive,
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
  EmailPayloadSubscriberAttributes,
  GuStageLive,
  SQS,
  SQSLive,
  SttpClientLive,
}
import sttp.tapir.*
import sttp.tapir.EndpointIO.Example
import sttp.tapir.Schema
import sttp.tapir.json.zio.jsonBody
import zio.{Clock, IO, URIO, ZIO}
import zio.json.{DeriveJsonDecoder, DeriveJsonEncoder, JsonDecoder, JsonEncoder}

import java.time.LocalDate
import java.time.format.DateTimeFormatter

// this is the description for just the one endpoint
object ProductMoveEndpoint {

  // run this to test locally via console with some hard coded data
  def main(args: Array[String]): Unit = LambdaEndpoint.runTest(
    run("A-S00448793", ExpectedInput(1, false, None, None)),
  )

  val server: sttp.tapir.server.ServerEndpoint.Full[
    Unit,
    Unit,
    (String, ProductMoveEndpointTypes.ExpectedInput),
    Unit,
    ProductMoveEndpointTypes.OutputBody,
    Any,
    ZIOApiGatewayRequestHandler.TIO,
  ] = {
    val subscriptionNameCapture: EndpointInput.PathCapture[String] =
      EndpointInput.PathCapture[String](
        Some("subscriptionName"),
        implicitly,
        EndpointIO.Info.empty.copy(
          description = Some("Name of subscription to be moved to a different product."),
          examples = List(Example("A-S000001", None, None)),
        ), // A-S000001
      )
    val endpointDescription: PublicEndpoint[
      (String, ProductMoveEndpointTypes.ExpectedInput),
      Unit,
      ProductMoveEndpointTypes.OutputBody,
      Any,
    ] =
      endpoint.post
        .in("product-move")
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
          ),
        )
        .summary("Replaces the existing subscription with a new one.")
        .description(
          """Cancels the existing subscription and replaces it with a new subscription
            |to a different type of product.
            |Also manages all the service comms associated with the movement.""".stripMargin,
        )
    endpointDescription
      .serverLogic[TIO] { (subscriptionName, postData) =>
        run(subscriptionName, postData).tapEither(result => ZIO.log("result tapped: " + result)).map(Right.apply)
      }
  }

  private def run(subscriptionName: String, postData: ExpectedInput): TIO[OutputBody] =
    productMove(subscriptionName, postData)
      .provide(
        GetSubscriptionLive.layer,
        AwsCredentialsLive.layer,
        SttpClientLive.layer,
        ZuoraClientLive.layer,
        ZuoraGetLive.layer,
        SubscriptionUpdateLive.layer,
        SQSLive.layer,
        GetAccountLive.layer,
        GuStageLive.layer,
        DynamoLive.layer,
      )

  extension [R, E, A](zio: ZIO[R, E, A])
    def addLogMessage(message: String) = zio.catchAll { error =>
      ZIO.fail(s"$message failed with: $error")
    }

  extension (billingPeriod: BillingPeriod)
    def value: IO[String, String] =
      billingPeriod match {
        case Monthly => ZIO.succeed("month")
        case Annual => ZIO.succeed("annual")
        case _ => ZIO.fail(s"Unrecognised billing period $billingPeriod")
      }

  def getSingleOrNotEligible[A](list: List[A], message: String): IO[String, A] =
    list.length match {
      case 1 => ZIO.succeed(list.head)
      case _ => ZIO.fail(message)
    }
  private[productmove] def productMove(
      subscriptionName: String,
      postData: ExpectedInput,
  ): ZIO[GetSubscription with SubscriptionUpdate with GetAccount with SQS with Dynamo with Stage, String, OutputBody] =
    (for {
      _ <- ZIO.log("PostData: " + postData.toString)
      subscription <- GetSubscription.get(subscriptionName).addLogMessage("GetSubscription")
      currentRatePlan <- getSingleOrNotEligible(
        subscription.ratePlans,
        s"Subscription: $subscriptionName has more than one ratePlan",
      )
      ratePlanCharge <- getSingleOrNotEligible(
        currentRatePlan.ratePlanCharges,
        s"Subscription: $subscriptionName has more than one ratePlanCharge",
      )
      result <-
        if (postData.preview)
          doPreview(subscription.id, postData.price, ratePlanCharge.billingPeriod, currentRatePlan.id)
        else
          doUpdate(
            subscriptionName,
            ratePlanCharge,
            postData.price,
            currentRatePlan,
            subscription,
            postData.csrUserId,
            postData.caseId,
          )
    } yield result).fold(errorMessage => InternalServerError(errorMessage), success => success)

  def doPreview(
      subscriptionId: String,
      price: BigDecimal,
      billingPeriod: BillingPeriod,
      currentRatePlanId: String,
  ): ZIO[SubscriptionUpdate with Stage, String, OutputBody] = for {
    _ <- ZIO.log("Fetching Preview from Zuora")
    previewResponse <- SubscriptionUpdate
      .preview(subscriptionId, billingPeriod, price, currentRatePlanId)
      .addLogMessage("SubscriptionUpdate")
  } yield previewResponse

  def doUpdate(
      subscriptionName: String,
      ratePlanCharge: RatePlanCharge,
      price: BigDecimal,
      currentRatePlan: GetSubscription.RatePlan,
      subscription: GetSubscription.GetSubscriptionResponse,
      csrUserId: Option[String],
      caseId: Option[String],
  ) = for {
    _ <- ZIO.log("Performing product move update")
    stage <- ZIO.service[Stage]
    account <- GetAccount.get(subscription.accountNumber).addLogMessage("GetAccount")

    identityId <- ZIO
      .fromOption(account.basicInfo.IdentityId__c)
      .orElseFail(s"identityId is null for subscription name $subscriptionName")

    updateResponse <- SubscriptionUpdate
      .update(subscription.id, ratePlanCharge.billingPeriod, price, currentRatePlan.id)
      .addLogMessage("SubscriptionUpdate")

    todaysDate <- Clock.currentDateTime.map(_.toLocalDate)
    billingPeriod <- ratePlanCharge.billingPeriod.value

    paidAmount = updateResponse.paidAmount.getOrElse(BigDecimal(0))

    emailFuture <- SQS
      .sendEmail(
        message = EmailMessage(
          EmailPayload(
            Address = Some(account.billToContact.workEmail),
            ContactAttributes = EmailPayloadContactAttributes(
              SubscriberAttributes = EmailPayloadSubscriberAttributes(
                first_name = account.billToContact.firstName,
                last_name = account.billToContact.lastName,
                currency = account.basicInfo.currency.symbol,
                price = price.setScale(2, BigDecimal.RoundingMode.FLOOR).toString,
                first_payment_amount = paidAmount.setScale(2, BigDecimal.RoundingMode.FLOOR).toString,
                date_of_first_payment = todaysDate.format(DateTimeFormatter.ofPattern("d MMMM uuuu")),
                payment_frequency = billingPeriod + "ly",
                subscription_id = subscriptionName,
              ),
            ),
          ),
          "SV_RCtoSP_Switch",
          account.basicInfo.sfContactId__c,
          Some(identityId),
        ),
      )
      .fork

    salesforceTrackingFuture <- SQS
      .queueSalesforceTracking(
        SalesforceRecordInput(
          subscriptionName,
          BigDecimal(ratePlanCharge.price),
          price,
          currentRatePlan.productName,
          currentRatePlan.ratePlanName,
          "Supporter Plus",
          todaysDate,
          todaysDate,
          paidAmount,
          csrUserId,
          caseId,
        ),
      )
      .fork

    supporterPlusRatePlanIds <- ZIO.fromEither(getSupporterPlusRatePlanIds(stage, ratePlanCharge.billingPeriod))
    amendSupporterProductDynamoTableFuture <- Dynamo
      .writeItem(
        SupporterRatePlanItem(
          subscriptionName,
          identityId = identityId,
          gifteeIdentityId = None,
          productRatePlanId = supporterPlusRatePlanIds.ratePlanId,
          productRatePlanName = "product-move-api added Supporter Plus Monthly",
          termEndDate = todaysDate.plusDays(7),
          contractEffectiveDate = todaysDate,
          contributionAmount = None,
        ),
      )
      .fork

    requests = emailFuture
      .zip(salesforceTrackingFuture)
      .zip(amendSupporterProductDynamoTableFuture)

    _ <- requests.join

  } yield Success("Product move completed successfully")
}

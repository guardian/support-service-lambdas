package com.gu.productmove.endpoint.cancel

import cats.data.NonEmptyList
import com.gu.newproduct.api.productcatalog.ZuoraIds
import com.gu.newproduct.api.productcatalog.ZuoraIds.SupporterPlusZuoraIds
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpointTypes.*
import com.gu.productmove.endpoint.cancel.zuora.GetSubscription.{GetSubscriptionResponse, RatePlanCharge}
import com.gu.productmove.{AwsCredentialsLive, AwsS3, AwsS3Live, GuStageLive, SQS, SQSLive, SttpClientLive}
import com.gu.productmove.endpoint.cancel.zuora.{GetSubscription, GetSubscriptionLive}
import com.gu.productmove.framework.ZIOApiGatewayRequestHandler.TIO
import com.gu.productmove.framework.{LambdaEndpoint, ZIOApiGatewayRequestHandler}
import com.gu.productmove.invoicingapi.InvoicingApiRefund.RefundResponse
import com.gu.productmove.invoicingapi.{InvoicingApiRefund, InvoicingApiRefundLive}
import com.gu.productmove.zuora.rest.*
import com.gu.productmove.zuora.{
  CreditBalanceAdjustment,
  CreditBalanceAdjustmentLive,
  GetInvoice,
  GetInvoiceLive,
  GetInvoiceItemsForSubscription,
  GetInvoiceItemsForSubscriptionLive,
  InvoiceItemAdjustment,
  InvoiceItemAdjustmentLive,
  ZuoraCancel,
  ZuoraCancelLive,
  ZuoraSetCancellationReason,
  ZuoraSetCancellationReasonLive,
}
import com.gu.productmove.{AwsCredentialsLive, AwsS3Live, GuStageLive, SttpClientLive}
import com.gu.util.config
import sttp.tapir.*
import sttp.tapir.EndpointIO.Example
import sttp.tapir.json.zio.jsonBody
import sttp.client3.SttpBackend
import zio.{Clock, IO, Task, ZIO}
import com.gu.productmove.refund.*
import RefundType.*

import java.time.LocalDate
import scala.concurrent.Future

// this is the description for just the one endpoint
object SubscriptionCancelEndpoint {

  // run this to test locally via console with some hard coded data
  def main(args: Array[String]): Unit = LambdaEndpoint.runTest(
    run("A-S00424052", ExpectedInput("targetProductId")),
  )

  val server: sttp.tapir.server.ServerEndpoint.Full[
    Unit,
    Unit,
    (String, ExpectedInput),
    Unit,
    OutputBody,
    Any,
    ZIOApiGatewayRequestHandler.TIO,
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
    endpointDescription.serverLogic[TIO](run)
  }

  private def run(subscriptionName: String, postData: ExpectedInput): TIO[Right[Nothing, OutputBody]] = for {
    _ <- ZIO.log(s"INPUT: $subscriptionName: $postData")
    res <- subscriptionCancel(subscriptionName, postData)
      .provide(
        GetSubscriptionLive.layer,
        ZuoraCancelLive.layer,
        AwsCredentialsLive.layer,
        SttpClientLive.layer,
        ZuoraClientLive.layer,
        ZuoraGetLive.layer,
        GuStageLive.layer,
        ZuoraSetCancellationReasonLive.layer,
        SQSLive.layer,
        AwsS3Live.layer,
        InvoicingApiRefundLive.layer,
        CreditBalanceAdjustmentLive.layer,
        GetInvoiceItemsForSubscriptionLive.layer,
        GetInvoiceLive.layer,
        InvoiceItemAdjustmentLive.layer,
      )
      .tapEither(result => ZIO.log(s"OUTPUT: $subscriptionName: " + result))
  } yield Right(res)

  def asSingle[A](list: List[A], message: String): IO[String, A] =
    list match {
      case singlePlan :: Nil => ZIO.succeed(singlePlan)
      case wrongNumber =>
        ZIO.fail(
          s"Subscription can't be cancelled as we didn't have a single $message: ${wrongNumber.length}: $wrongNumber",
        )
    }

  def asNonEmptyList[A](list: List[A], message: String): IO[String, NonEmptyList[A]] =
    NonEmptyList.fromList(list) match {
      case Some(nel) => ZIO.succeed(nel)
      case None => ZIO.fail(s"Subscription can't be cancelled as the charge list is empty")
    }

  private def getSupporterPlusCharge(charges: NonEmptyList[RatePlanCharge], ids: SupporterPlusZuoraIds) = {
    val supporterPlusCharge = charges.find(charge =>
      charge.productRatePlanChargeId == ids.annual.productRatePlanChargeId.value ||
        charge.productRatePlanChargeId == ids.monthly.productRatePlanChargeId.value ||
        charge.productRatePlanChargeId == ids.monthlyV2.productRatePlanChargeId.value ||
        charge.productRatePlanChargeId == ids.annualV2.productRatePlanChargeId.value,
    )
    supporterPlusCharge
      .map(ZIO.succeed(_))
      .getOrElse(ZIO.fail("Subscription cannot be cancelled as it was not a Supporter Plus subscription"))
  }

  def doRefund(refundType: RefundType, refundInput: RefundInput) =
    refundType match {
      case Asynchronous =>
        SQS.queueRefund(refundInput)
      case Synchronous => runSynchronousRefund(refundInput)
      case NoRefund =>
        ZIO.succeed(())
    }

  def runSynchronousRefund(refundInput: RefundInput): ZIO[
    InvoicingApiRefund
      with CreditBalanceAdjustment
      with Stage
      with SttpBackend[Task, Any]
      with AwsS3
      with GetInvoiceItemsForSubscription
      with GetInvoice
      with InvoiceItemAdjustment,
    String,
    Unit,
  ] = for {
    _ <- ZIO.log(s"Attempting to synchronously refund subscription ${refundInput.subscriptionName}")
    _ <- RefundSupporterPlus.applyRefund(refundInput)
  } yield ()

  private def subIsWithinFirst14Days(now: LocalDate, contractEffectiveDate: LocalDate) =
    now.isBefore(contractEffectiveDate.plusDays(15)) // This is 14 days from the day after the sub was taken out

  private[productmove] def subscriptionCancel(
      subscriptionName: String,
      postData: ExpectedInput,
      refundType: RefundType = Asynchronous, // Used to test running cancel and refund locally
  ): ZIO[
    GetSubscription
      with ZuoraCancel
      with SQS
      with Stage
      with ZuoraSetCancellationReason
      with InvoicingApiRefund
      with CreditBalanceAdjustment
      with Stage
      with SttpBackend[Task, Any]
      with AwsS3
      with GetInvoiceItemsForSubscription
      with GetInvoice
      with InvoiceItemAdjustment,
    String,
    OutputBody,
  ] =
    (for {
      _ <- ZIO.log(s"PostData: ${postData.toString}")
      stage <- ZIO.service[Stage]
      _ <- ZIO.log(s"Stage is $stage")
      subscription <- GetSubscription.get(subscriptionName)
      _ <- ZIO.log(s"Subscription is $subscription")

      // check sub info to make sure it's a supporter plus
      // should look at the relevant charge, members data api looks for the Paid Plan.
      // initially this will only apply to new prop which won't have multiple plans or charges.
      zuoraIds <- ZIO.fromEither(ZuoraIds.zuoraIdsForStage(config.Stage(stage.toString)))
      ratePlan <- asSingle(subscription.ratePlans.filterNot(_.lastChangeType.contains("Remove")), "ratePlan")
      charges <- asNonEmptyList(ratePlan.ratePlanCharges, "ratePlanCharge")
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
          s"Subscription charged through date is null is for supporter plus subscription $subscriptionName. " +
            s"This is an error because we expect to be able to use the charged through date to work out the effective cancellation date",
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
                s"URGENT: subscription $subscriptionName should be refunded but has no negative invoice attached.",
              )
            _ <- ZIO.log(s"Negative invoice id is $negativeInvoice")
            _ <- doRefund(refundType, RefundInput(subscriptionName))
          } yield ()
        else ZIO.succeed(RefundResponse("Success", ""))

      _ <- ZIO.log(s"Attempting to update cancellation reason on Zuora subscription")
      _ <- ZuoraSetCancellationReason
        .update(subscriptionName, subscription.version + 1, postData.reason)
      // Version +1 because the cancellation will have incremented the version
    } yield ()).fold(
      errorMessage => InternalServerError(errorMessage),
      _ => Success("Subscription was successfully cancelled"),
    )
}

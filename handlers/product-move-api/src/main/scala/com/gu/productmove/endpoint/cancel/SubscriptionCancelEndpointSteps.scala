package com.gu.productmove.endpoint.cancel

import cats.data.NonEmptyList
import com.gu.newproduct.api.productcatalog.ZuoraIds
import com.gu.newproduct.api.productcatalog.ZuoraIds.SupporterPlusZuoraIds
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.cancel.SubscriptionCancelEndpointTypes.ExpectedInput
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{BadRequest, InternalServerError, OutputBody, Success}
import com.gu.productmove.endpoint.move.assertSubscriptionBelongsToIdentityUser
import com.gu.productmove.endpoint.zuora.GetSubscriptionToCancel
import com.gu.productmove.endpoint.zuora.GetSubscriptionToCancel.RatePlanCharge
import com.gu.productmove.invoicingapi.InvoicingApiRefund.RefundResponse
import com.gu.productmove.refund.RefundInput
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.{
  CancellationResponse,
  GetAccount,
  GetSubscription,
  ZuoraAccountId,
  ZuoraCancel,
  ZuoraSetCancellationReason,
}
import com.gu.productmove.{EmailMessage, IdentityId, SQS}
import com.gu.util.config
import zio.{Clock, IO, RIO, Task, ZIO}

import java.time.LocalDate

class SubscriptionCancelEndpointSteps(
    getSubscription: GetSubscription,
    getAccount: GetAccount,
    getSubscriptionToCancel: GetSubscriptionToCancel,
    zuoraCancel: ZuoraCancel,
    sqs: SQS,
    stage: Stage,
    zuoraSetCancellationReason: ZuoraSetCancellationReason,
    today: LocalDate,
) {
  private[productmove] def subscriptionCancel(
      subscriptionName: SubscriptionName,
      postData: ExpectedInput,
      identityId: IdentityId,
  ): Task[OutputBody] = {
    val maybeResult: IO[OutputBody | Throwable, Success] = for {
      subscriptionAccount <- assertSubscriptionBelongsToIdentityUser(
        getSubscription,
        getAccount,
        subscriptionName,
        Some(identityId),
      )
      (_, account) = subscriptionAccount
      _ <- ZIO.log(s"Cancel Supporter Plus - PostData: $postData")
      subscription <- getSubscriptionToCancel.get(subscriptionName)
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
      ratePlan <- asSingle(
        subscription.ratePlans.filter { ratePlan =>
          val isDiscount = ratePlan.productName == "Discounts"
          // we found that contrary to the docs, if effectiveStartDate and effectiveEndDate are today,
          // zuora still returns it as a current-segment, so we need to ignore it
          val hasCharges = ratePlan.ratePlanCharges.exists(_.effectiveEndDate != today)
          !isDiscount && hasCharges
        },
        "ratePlan",
      )
      charges <- asNonEmptyList(
        ratePlan.ratePlanCharges,
        s"Subscription can't be cancelled as the charge list is empty",
      )
      supporterPlusCharge <- getSupporterPlusCharge(charges, zuoraIds.supporterPlusZuoraIds)

      today <- Clock.currentDateTime.map(_.toLocalDate)

      // check whether the sub is within the first 14 days of purchase - if it is then the subscriber is entitled to a refund
      // Use LastPlanAddedDate__c if available (new subscriptions), otherwise fall back to effectiveStartDate (legacy subscriptions)
      subscriptionStartDate = subscription.LastPlanAddedDate__c.getOrElse(supporterPlusCharge.effectiveStartDate)
      shouldBeRefunded = subIsWithinFirst14Days(today, subscriptionStartDate)
      _ <- ZIO.log(s"Should be refunded is $shouldBeRefunded (using LastPlanAddedDate__c: ${subscription.LastPlanAddedDate__c.isDefined})")

      cancellationDate <- ZIO
        .fromOption(
          if (shouldBeRefunded)
            Some(subscriptionStartDate)
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
      cancellationResponse <- zuoraCancel.cancel(subscriptionName, cancellationDate)
      _ <- ZIO.log("Sub cancelled as of: " + cancellationDate)

      _ <- ZIO.log(
        if (shouldBeRefunded) s"Adding sub to the queue to do the refund asynchronously" else "No refund needed",
      )
      _ <-
        if (shouldBeRefunded)
          sqs.queueRefund(RefundInput(subscriptionName, account.basicInfo.id, today))
        else
          ZIO.succeed(())

      _ <- ZIO.log(s"Attempting to update cancellation reason on Zuora subscription")
      _ <- zuoraSetCancellationReason
        .update(
          subscriptionName,
          subscription.version + 1,
          postData.reason,
        ) // Version +1 because the cancellation will have incremented the version
      _ <- sqs.sendEmail(EmailMessage.cancellationEmail(account, cancellationDate))
    } yield Success(s"Subscription ${subscriptionName.value} was successfully cancelled")
    maybeResult.catchAll {
      case failure: OutputBody => ZIO.succeed(failure)
      case other: Throwable => ZIO.fail(other)
    }
  }

  def asSingle[A](list: List[A], message: String): Task[A] =
    list match {
      case singlePlan :: Nil => ZIO.succeed(singlePlan)
      case wrongNumber =>
        ZIO.fail(
          new Throwable(
            s"Subscription can't be cancelled as we didn't have a single $message: ${wrongNumber.length}: $wrongNumber",
          ),
        )
    }

  def asNonEmptyList[A](list: List[A], message: String): Task[NonEmptyList[A]] =
    NonEmptyList.fromList(list) match {
      case Some(nel) => ZIO.succeed(nel)
      case None => ZIO.fail(new Throwable(message))
    }

  private def getSupporterPlusCharge(
      charges: NonEmptyList[RatePlanCharge],
      ids: SupporterPlusZuoraIds,
  ): Task[RatePlanCharge] = {
    val supporterPlusCharge = charges.find(charge =>
      charge.productRatePlanChargeId == ids.annual.productRatePlanChargeId.value ||
        charge.productRatePlanChargeId == ids.monthly.productRatePlanChargeId.value ||
        charge.productRatePlanChargeId == ids.monthlyV2.productRatePlanChargeId.value ||
        charge.productRatePlanChargeId == ids.annualV2.productRatePlanChargeId.value,
    )
    supporterPlusCharge
      .map(ZIO.succeed(_))
      .getOrElse(
        ZIO.fail(new Throwable("Subscription cannot be cancelled as it was not a Supporter Plus subscription")),
      )
  }

  private def subIsWithinFirst14Days(now: LocalDate, contractEffectiveDate: LocalDate) =
    now.isBefore(contractEffectiveDate.plusDays(15)) // This is 14 days from the day after the sub was taken out

}

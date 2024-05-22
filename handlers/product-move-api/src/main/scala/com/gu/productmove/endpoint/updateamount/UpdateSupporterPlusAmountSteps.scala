package com.gu.productmove.endpoint.updateamount

import cats.data.NonEmptyList
import com.gu.i18n
import com.gu.newproduct.api.addsubscription.validation.supporterplus.AmountLimits
import com.gu.newproduct.api.productcatalog.ZuoraIds.SupporterPlusZuoraIds
import com.gu.newproduct.api.productcatalog.{Annual, BillingPeriod, Monthly, ZuoraIds}
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.endpoint.available.Currency
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.*
import com.gu.productmove.endpoint.updateamount.UpdateSupporterPlusAmountEndpointTypes.ExpectedInput
import com.gu.productmove.endpoint.updateamount.ZIOExtension.{asNonEmptyList, asSingle}
import com.gu.productmove.zuora.GetSubscription.{GetSubscriptionResponse, RatePlanCharge}
import com.gu.productmove.zuora.*
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.{EmailMessage, SQS}
import com.gu.util.config
import zio.{IO, RIO, Task, ZIO}

object UpdateSupporterPlusAmountSteps {

  private[updateamount] def subscriptionUpdateAmount(subscriptionName: SubscriptionName, postData: ExpectedInput): RIO[
    GetSubscription with GetAccount with SubscriptionUpdate with SQS with Stage,
    OutputBody,
  ] = {
    val maybeResult: ZIO[
      SQS with SubscriptionUpdate with Stage with GetAccount with GetSubscription,
      OutputBody | Throwable,
      Success,
    ] = for {
      _ <- ZIO.log(s"Update Supporter Plus Amount - PostData: ${postData.toString}")

      subscription <- GetSubscription.get(subscriptionName)
      _ <- ZIO.log("Subscription: " + subscription)

      account <- GetAccount.get(subscription.accountNumber)
      currency <- account.basicInfo.currency.toI18nCurrency

      supporterPlusZuoraIds <- getSupporterPlusIds

      supporterPlusData <- getSupporterPlusData(subscription, supporterPlusZuoraIds)
      _ <- ZIO.log("supporter plus data: " + subscription)

      _ <- validateNewAmount(currency, postData.newPaymentAmount, supporterPlusData.isAnnual)

      newVariableChargeAmount = postData.newPaymentAmount - supporterPlusData.basePrice

      applyFromDate = supporterPlusData.contributionCharge.chargedThroughDate.getOrElse(
        supporterPlusData.contributionCharge.effectiveStartDate,
      )

      updateRequestBody = UpdateSubscriptionAmount(
        List(
          UpdateSubscriptionAmountItem(
            applyFromDate,
            applyFromDate,
            applyFromDate,
            supporterPlusData.ratePlanId,
            List(
              ChargeUpdateDetails(
                price = newVariableChargeAmount,
                ratePlanChargeId = supporterPlusData.contributionCharge.id,
              ),
            ),
          ),
        ),
      )

      _ <- SubscriptionUpdate.update[SubscriptionUpdateResponse](SubscriptionName(subscription.id), updateRequestBody)

      billingPeriod <- supporterPlusData.contributionCharge.billingPeriod.value

      _ <- SQS
        .sendEmail(
          EmailMessage.updateAmountEmail(
            account,
            postData.newPaymentAmount,
            account.basicInfo.currency,
            billingPeriod,
            applyFromDate,
          ),
        )
    } yield Success(
      s"Successfully updated payment amount for Supporter Plus subscription ${subscriptionName.value} with amount ${postData.newPaymentAmount}",
    )
    maybeResult.catchAll {
      case failure: OutputBody => ZIO.succeed(failure)
      case other: Throwable => ZIO.fail(other)
    }
  }

  private def getSupporterPlusData(
      subscription: GetSubscriptionResponse,
      ids: SupporterPlusZuoraIds,
  ): Task[SupporterPlusCharges] =
    for {
      ratePlan <- asSingle(subscription.ratePlans.filterNot(_.lastChangeType.contains("Remove")), "ratePlan")
      charges <- asNonEmptyList(ratePlan.ratePlanCharges, "ratePlanCharge")
      chargesById <- {
        val (errors, chargesById) = charges.groupBy(_.productRatePlanChargeId).partitionMap {
          case (id, NonEmptyList(charge, Nil)) => Right((id, charge))
          case multiple => Left(multiple.toString)
        }
        if (errors.nonEmpty)
          ZIO.fail(new Throwable("subscription had duplicate charges")).logError(s"errors: $errors")
        else ZIO.succeed(chargesById.toMap)
      }
      chargeIdsOfInterest = {
        import ids.*
        List(
          annual.productRatePlanChargeId,
          monthly.productRatePlanChargeId,
          annualV2.productRatePlanChargeId,
          monthlyV2.productRatePlanChargeId,
          annualV2.contributionProductRatePlanChargeId,
          monthlyV2.contributionProductRatePlanChargeId,
        ).map(_.value)
      }
      supporterPlusCharges <- chargeIdsOfInterest.map(chargesById.get) match {
        case List(Some(annual), None, None, None, None, None) =>
          ZIO.succeed(SupporterPlusCharges(ratePlan.id, annual, true, BigDecimal(0)))
        case List(None, Some(monthly), None, None, None, None) =>
          ZIO.succeed(SupporterPlusCharges(ratePlan.id, monthly, false, BigDecimal(0)))
        case List(None, None, Some(annual), None, Some(contr), None) if annual.price.isDefined =>
          ZIO.succeed(SupporterPlusCharges(ratePlan.id, contr, true, BigDecimal(annual.price.get)))
        case List(None, None, None, Some(monthly), None, Some(contr)) if monthly.price.isDefined =>
          ZIO.succeed(SupporterPlusCharges(ratePlan.id, contr, false, BigDecimal(monthly.price.get)))
        case other => ZIO.fail(new Throwable("subscription was not in valid state")).logError(s"charges: $other")
      }

    } yield supporterPlusCharges

  private def getSupporterPlusIds: ZIO[Stage, InternalServerError, SupporterPlusZuoraIds] = {
    ZIO
      .serviceWithZIO[Stage](stage =>
        ZIO.fromEither(
          ZuoraIds.zuoraIdsForStage(config.Stage(stage.toString)).left.map(InternalServerError.apply),
        ),
      )
      .map(_.supporterPlusZuoraIds)
  }

  private def validateNewAmount(
      currency: com.gu.i18n.Currency,
      amount: BigDecimal,
      isAnnual: Boolean,
  ): IO[BadRequest, Unit] = {
    val limitsForCurrency = AmountLimits.supporterPlusLimitsfor(currency)
    val limits = if (isAnnual) limitsForCurrency.annual else limitsForCurrency.monthly
    for {
      _ <- ZIO.unless((amount * 100) <= limits.max)(
        ZIO.fail(BadRequest(s"amount must not be more than $currency ${AmountLimits.fromMinorToMajor(limits.max)}")),
      )
      _ <- ZIO.unless((amount * 100) >= limits.min)(
        ZIO.fail(BadRequest(s"amount must be at least $currency ${AmountLimits.fromMinorToMajor(limits.min)}")),
      )
    } yield ()
  }

  private case class SupporterPlusCharges(
      ratePlanId: String,
      contributionCharge: RatePlanCharge,
      isAnnual: Boolean,
      basePrice: BigDecimal,
  )

}

extension (currency: Currency) {
  def toI18nCurrency: Task[i18n.Currency] =
    ZIO.fromOption(com.gu.i18n.Currency.fromString(currency.code)).orElseFail(new Throwable("incorrect currency"))
}

extension (billingPeriod: BillingPeriod) {
  def value: Task[String] =
    billingPeriod match {
      case Monthly => ZIO.succeed("month")
      case Annual => ZIO.succeed("annual")
      case _ => ZIO.fail(new Throwable(s"Unrecognised billing period $billingPeriod"))
    }
}

package com.gu.productmove.endpoint.move.switchtype

import com.gu.i18n.Currency
import com.gu.newproduct.api.productcatalog.PlanId.{AnnualSupporterPlus, MonthlySupporterPlus}
import com.gu.newproduct.api.productcatalog.ZuoraIds.zuoraIdsForStage
import com.gu.newproduct.api.productcatalog.*
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.zuora.{AddRatePlan, ChargeOverrides, GetCatalogue, RemoveRatePlan}
import com.gu.util.config
import zio.{Clock, Task, ZIO}

class GetRatePlans(
    stage: Stage,
    getCatalogue: GetCatalogue,
) {
  def getRatePlans(
      billingPeriod: BillingPeriod,
      currency: Currency,
      ratePlanIdToRemove: String,
      price: BigDecimal,
  ): Task[(List[AddRatePlan], List[RemoveRatePlan])] =
    for {
      date <- Clock.currentDateTime.map(_.toLocalDate)
      productSwitchRatePlanIds <- ZIO.fromEither(getProductSwitchRatePlanIds(billingPeriod))
      overrideAmount <- getContributionAmount(price, currency, billingPeriod)
      chargeOverride = ChargeOverrides(
        price = Some(overrideAmount),
        productRatePlanChargeId = productSwitchRatePlanIds.supporterPlusRatePlanIds.contributionRatePlanChargeId,
      )
      addRatePlan = AddRatePlan(
        date,
        productSwitchRatePlanIds.supporterPlusRatePlanIds.ratePlanId,
        chargeOverrides = List(chargeOverride),
      )
      removeRatePlan = RemoveRatePlan(date, ratePlanIdToRemove)
    } yield (List(addRatePlan), List(removeRatePlan))

  def getProductSwitchRatePlanIds(
      billingPeriod: BillingPeriod,
  ): Either[Throwable, ProductSwitchRatePlanIds] = {
    zuoraIdsForStage(config.Stage(stage.toString)).left
      .map(err => new Throwable(err))
      .flatMap { zuoraIds =>
        import zuoraIds.contributionsZuoraIds.{annual, monthly}
        import zuoraIds.supporterPlusZuoraIds.{annualV2, monthlyV2}

        billingPeriod match {
          case Monthly =>
            Right(
              ProductSwitchRatePlanIds(
                SupporterPlusRatePlanIds(
                  monthlyV2.productRatePlanId.value,
                  monthlyV2.productRatePlanChargeId.value,
                  monthlyV2.contributionProductRatePlanChargeId.value,
                ),
                RecurringContributionRatePlanIds(monthly.productRatePlanChargeId.value),
              ),
            )
          case Annual =>
            Right(
              ProductSwitchRatePlanIds(
                SupporterPlusRatePlanIds(
                  annualV2.productRatePlanId.value,
                  annualV2.productRatePlanChargeId.value,
                  annualV2.contributionProductRatePlanChargeId.value,
                ),
                RecurringContributionRatePlanIds(annual.productRatePlanChargeId.value),
              ),
            )
          case _ => Left(new Throwable(s"Error when matching on billingPeriod $billingPeriod"))
        }
      }
  }

  private def getSubscriptionPriceInMinorUnits(
      catalogPlanId: PlanId,
      currency: Currency,
  ): Task[AmountMinorUnits] =
    for {
      productRatePlanId <- ZIO
        .fromEither(
          zuoraIdsForStage(config.Stage(stage.toString)).map(_.apiIdToRateplanId(catalogPlanId)),
        )
        .mapError(new Throwable(_))
      prices <- getCatalogue.get
    } yield {
      val pricesForCurrency = for {
        product <- prices.products
        plan <- product.productRatePlans.filter(_.id == productRatePlanId)
        charge <- plan.productRatePlanCharges
        pricing <- charge.pricing
        chargeCurrency <- Currency.fromString(pricing.currency)
        if chargeCurrency == currency
      } yield pricing.priceMinorUnits
      AmountMinorUnits(pricesForCurrency.sum)
    }

  private def getContributionAmount(
      price: BigDecimal,
      currency: Currency,
      billingPeriod: BillingPeriod,
  ): Task[BigDecimal] =
    // work out how much of what the user is paying can be treated as a contribution (total amount - cost of sub)
    val catalogPlanId =
      if (billingPeriod == Monthly)
        MonthlySupporterPlus
      else
        AnnualSupporterPlus
    getSubscriptionPriceInMinorUnits(catalogPlanId, currency)
      .map(subscriptionChargePrice => price - (subscriptionChargePrice.value / 100))

  def getSupporterPlusRatePlanIds(billingPeriod: BillingPeriod): ZIO[Any, Throwable, SupporterPlusRatePlanIds] = for {
    productSwitchRatePlanIds <- ZIO.fromEither(getProductSwitchRatePlanIds(billingPeriod))
  } yield productSwitchRatePlanIds.supporterPlusRatePlanIds

}

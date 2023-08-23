package com.gu.newproduct.api.productcatalog

import com.gu.i18n.Currency
import com.gu.newproduct.api.addsubscription.Formatters._
import com.gu.newproduct.api.productcatalog.plans._

import java.time.{DayOfWeek, LocalDate}

object NewProductApi {

  private def paymentPlansFor(billingPeriod: BillingPeriod, pricesByCurrency: Map[Currency, AmountMinorUnits]): Map[Currency, PaymentPlan] = {

    val billingPeriodDescription = billingPeriod match {
      case Monthly => "every month"
      case Quarterly => "every 3 months"
      case Annual => "every 12 months"
      case SixWeeks => "for the first six weeks"
    }
    pricesByCurrency.map { case (currency, amount) =>
      currency ->
        PaymentPlan(
          currency = currency,
          amountMinorUnits = amount,
          billingPeriod = billingPeriod,
          description = s"${currency.iso} ${amount.formatted} $billingPeriodDescription",
        )
    }
  }

  def catalog(
    pricingFor: PlanId => Map[Currency, AmountMinorUnits],
    getStartDateFromFulfilmentFiles: (ProductType, List[DayOfWeek]) => LocalDate,
    today: LocalDate,
  ): Map[PlanId, Plan] = {

    val allProducts = 
      new VoucherPlans(getStartDateFromFulfilmentFiles).planInfo ++
        new SupporterPlusPlans(today).planInfo ++
        new ContributionsPlans(today).planInfo ++
        new HomeDeliveryPlans(getStartDateFromFulfilmentFiles).planInfo ++
        new DigitalPackPlans(today).planInfo ++
        new GuardianWeeklyPlans(getStartDateFromFulfilmentFiles).planInfo ++
        new DigitalVoucherPlans(getStartDateFromFulfilmentFiles).planInfo

    allProducts.map({
      case (planId, planDescription, startDateRules, billingPeriod) =>
        planId -> Plan(planId, planDescription, startDateRules, paymentPlansFor(billingPeriod, pricingFor(planId)))
    }).toMap

  }
}

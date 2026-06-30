package com.gu.newproduct.api.productcatalog

import com.gu.i18n.Currency

import java.time.{DayOfWeek, LocalDate}

case class Plan(
    id: PlanId,
    description: PlanDescription,
    startDateRules: StartDateRules,
    paymentPlans: Map[Currency, PaymentPlan] = Map.empty,
)

sealed trait BillingPeriod
object Monthly extends BillingPeriod
object Quarterly extends BillingPeriod
object Annual extends BillingPeriod
object SixWeeks extends BillingPeriod

// Mirrors Zuora's charge-level taxMode. Tax-exclusive plans (e.g. the Canadian sales-tax plans)
// quote the price net of tax; the others are tax-inclusive.
sealed trait TaxMode
object TaxMode {
  case object TaxExclusive extends TaxMode
  case object TaxInclusive extends TaxMode

  def fromString(value: String): Option[TaxMode] = value match {
    case "TaxExclusive" => Some(TaxExclusive)
    case "TaxInclusive" => Some(TaxInclusive)
    case _ => None
  }
}

case class PaymentPlan(
    currency: Currency,
    amountMinorUnits: AmountMinorUnits,
    billingPeriod: BillingPeriod,
    description: String,
    taxMode: Option[TaxMode] = None,
)

case class PlanDescription(value: String) extends AnyVal

case class WindowSizeDays(value: Int) extends AnyVal

sealed trait DateRule

case class StartDateRules(daysOfWeekRule: Option[DaysOfWeekRule] = None, windowRule: WindowRule)

case class DaysOfWeekRule(allowedDays: List[DayOfWeek]) extends DateRule

case class WindowRule(startDate: LocalDate, maybeSize: Option[WindowSizeDays]) extends DateRule

case class AmountMinorUnits(value: Int) extends AnyVal

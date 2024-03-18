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

case class PaymentPlan(
    currency: Currency,
    amountMinorUnits: AmountMinorUnits,
    billingPeriod: BillingPeriod,
    description: String,
)

case class PlanDescription(value: String) extends AnyVal

case class WindowSizeDays(value: Int) extends AnyVal

sealed trait DateRule

case class StartDateRules(daysOfWeekRule: Option[DaysOfWeekRule] = None, windowRule: WindowRule)

case class DaysOfWeekRule(allowedDays: List[DayOfWeek]) extends DateRule

case class WindowRule(startDate: LocalDate, maybeSize: Option[WindowSizeDays]) extends DateRule

case class AmountMinorUnits(value: Int) extends AnyVal

package com.gu.newproduct.api.productcatalog

import java.time.DayOfWeek
import java.time.DayOfWeek._

case class Catalog(
  voucherWeekend: Plan,
  voucherEveryDay: Plan,
  monthlyContribution: Plan
)

object NewProductApi {
  val catalog: Catalog = {
    val voucherWindowRule = WindowRule(
      maybeCutOffDay = Some(DayOfWeek.TUESDAY),
      maybeStartDelay = Some(DelayDays(20)),
      maybeSize = Some(WindowSizeDays(28))
    )
    val weekendRule = DaysOfWeekRule(List(SATURDAY, SUNDAY))
    val mondayRule = DaysOfWeekRule(List(MONDAY))
    val voucherWeekendDateRules = StartDateRules(Some(weekendRule), Some(voucherWindowRule))
    val voucherWeekend = Plan(PlanId("voucher_weekend"), voucherWeekendDateRules)
    val voucherEveryDayDateRules = StartDateRules(Some(mondayRule), Some(voucherWindowRule))
    val voucherEveryDay = Plan(PlanId("voucher_everyDay"), voucherEveryDayDateRules)
    val monthlyContributionWindow = WindowRule(
      maybeSize = Some(WindowSizeDays(1)),
      maybeCutOffDay = None,
      maybeStartDelay = None
    )
    val monthlyContributionRules = StartDateRules(windowRule = Some(monthlyContributionWindow))
    val monthlyContribution = Plan(PlanId("monthly_contribution"), monthlyContributionRules)
    Catalog(
      voucherWeekend = voucherWeekend,
      voucherEveryDay = voucherEveryDay,
      monthlyContribution = monthlyContribution
    )
  }
}
case class PlanId(value: String) extends AnyVal
case class Plan(id: PlanId, startDateRules: StartDateRules = StartDateRules())

case class DelayDays(value: Int) extends AnyVal
case class WindowSizeDays(value: Int) extends AnyVal

sealed trait DateRule

case class StartDateRules(daysOfWeekRule: Option[DaysOfWeekRule] = None, windowRule: Option[WindowRule] = None)

case class DaysOfWeekRule(allowedDays: List[DayOfWeek]) extends DateRule

case class WindowRule(maybeCutOffDay: Option[DayOfWeek], maybeStartDelay: Option[DelayDays], maybeSize: Option[WindowSizeDays]) extends DateRule

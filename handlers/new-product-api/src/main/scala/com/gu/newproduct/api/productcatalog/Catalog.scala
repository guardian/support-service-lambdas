package com.gu.newproduct.api.productcatalog

import java.time.DayOfWeek

case class Catalog(
  voucherWeekend: Plan,
  voucherSaturday: Plan,
  voucherSunday: Plan,
  voucherEveryDay: Plan,
  voucherSixDay: Plan,
  voucherWeekendPlus: Plan,
  voucherSaturdayPlus: Plan,
  voucherSundayPlus: Plan,
  voucherEveryDayPlus: Plan,
  voucherSixDayPlus: Plan,
  monthlyContribution: Plan
) {
  val allPlans = List(
    voucherWeekend,
    voucherSaturday,
    voucherSunday,
    voucherEveryDay,
    voucherSixDay,
    voucherWeekendPlus,
    voucherSaturdayPlus,
    voucherSundayPlus,
    voucherEveryDayPlus,
    voucherSixDayPlus,
    monthlyContribution
  )

  val planForId: Map[PlanId, Plan] = allPlans.map(x => x.id -> x).toMap
}
sealed abstract class PlanId(val name: String)

object PlanId {

  case object MonthlyContribution extends PlanId("monthly_contribution")

  case object VoucherWeekend extends PlanId("voucher_weekend")

  case object VoucherEveryDay extends PlanId("voucher_everyday")

  case object VoucherSixDay extends PlanId("voucher_sixday")

  case object VoucherSaturday extends PlanId("voucher_saturday")

  case object VoucherSunday extends PlanId("voucher_sunday")

  case object VoucherWeekendPlus extends PlanId("voucher_weekend_plus")

  case object VoucherEveryDayPlus extends PlanId("voucher_everyday_plus")

  case object VoucherSixDayPlus extends PlanId("voucher_sixday_plus")

  case object VoucherSaturdayPlus extends PlanId("voucher_saturday_plus")

  case object VoucherSundayPlus extends PlanId("voucher_sunday_plus")

  val supported = List(
    MonthlyContribution,
    VoucherWeekend,
    VoucherEveryDay,
    VoucherSixDay,
    VoucherSaturday,
    VoucherSunday,
    VoucherWeekendPlus,
    VoucherEveryDayPlus,
    VoucherSixDayPlus,
    VoucherSaturdayPlus,
    VoucherSundayPlus
  )

  def fromName(name: String): Option[PlanId] = supported.find(_.name == name)
}

case class AmountMinorUnits(value: Int) extends AnyVal

case class Plan(id: PlanId, startDateRules: StartDateRules = StartDateRules())

case class DelayDays(value: Int) extends AnyVal

case class WindowSizeDays(value: Int) extends AnyVal

sealed trait DateRule

case class StartDateRules(daysOfWeekRule: Option[DaysOfWeekRule] = None, windowRule: Option[WindowRule] = None)

case class DaysOfWeekRule(allowedDays: List[DayOfWeek]) extends DateRule

case class WindowRule(maybeCutOffDay: Option[DayOfWeek], maybeStartDelay: Option[DelayDays], maybeSize: Option[WindowSizeDays]) extends DateRule

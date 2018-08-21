package com.gu.newproduct.api.productcatalog

import java.time.DayOfWeek
import java.time.DayOfWeek.{MONDAY, SATURDAY, SUNDAY}

import com.gu.newproduct.api.productcatalog.PlanId._

object NewProductApi {

  val catalog = {

    val voucherWindowRule = WindowRule(
      maybeCutOffDay = Some(DayOfWeek.TUESDAY),
      maybeStartDelay = Some(DelayDays(20)),
      maybeSize = Some(WindowSizeDays(28))
    )

    def voucherDateRules(allowedDays: List[DayOfWeek]) = StartDateRules(Some(DaysOfWeekRule(allowedDays)), Some(voucherWindowRule))

    val voucherMondayRules = voucherDateRules(List(MONDAY))
    val voucherSundayDateRules = voucherDateRules(List(SUNDAY))
    val voucherSaturdayDateRules = voucherDateRules(List(SATURDAY))

    val monthlyContributionWindow = WindowRule(
      maybeSize = Some(WindowSizeDays(1)),
      maybeCutOffDay = None,
      maybeStartDelay = None
    )
    val monthlyContributionRules = StartDateRules(windowRule = Some(monthlyContributionWindow))

    Catalog(
      voucherWeekendPlus = Plan(VoucherWeekendPlus, voucherSaturdayDateRules),
      voucherWeekend = Plan(VoucherWeekend, voucherSaturdayDateRules),
      voucherSixDay = Plan(VoucherSixDay, voucherMondayRules),
      voucherSixDayPlus = Plan(VoucherSixDayPlus, voucherMondayRules),
      voucherEveryDay = Plan(VoucherEveryDay, voucherMondayRules),
      voucherEveryDayPlus = Plan(VoucherEveryDayPlus, voucherMondayRules),
      voucherSaturday = Plan(VoucherSaturday, voucherSaturdayDateRules),
      voucherSaturdayPlus = Plan(VoucherSaturdayPlus, voucherSaturdayDateRules),
      voucherSunday = Plan(VoucherSunday, voucherSundayDateRules),
      voucherSundayPlus = Plan(VoucherSundayPlus, voucherSundayDateRules),
      monthlyContribution = Plan(MonthlyContribution, monthlyContributionRules)
    )
  }
}

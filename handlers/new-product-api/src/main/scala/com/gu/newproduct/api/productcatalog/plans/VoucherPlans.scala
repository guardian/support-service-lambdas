package com.gu.newproduct.api.productcatalog.plans

import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog._

import java.time.DayOfWeek.MONDAY
import java.time.{DayOfWeek, LocalDate}

class VoucherPlans(
    getStartDateFromFulfilmentFiles: (ProductType, List[DayOfWeek]) => LocalDate,
) {

  import PaperDays._

  private val VoucherSubscriptionStartDateWindowSize = WindowSizeDays(35)

  private def voucherWindowRule(issueDays: List[DayOfWeek]) = {
    WindowRule(
      startDate = getStartDateFromFulfilmentFiles(ProductType.NewspaperVoucherBook, issueDays),
      maybeSize = Some(VoucherSubscriptionStartDateWindowSize),
    )
  }

  private def voucherDateRules(allowedDays: List[DayOfWeek]) = StartDateRules(
    Some(DaysOfWeekRule(allowedDays)),
    voucherWindowRule(allowedDays),
  )

  private val voucherMondayRules = voucherDateRules(List(MONDAY))
  private val voucherSundayDateRules = voucherDateRules(sundayDays)
  private val voucherSaturdayDateRules = voucherDateRules(saturdayDays)

  val planInfo: List[(PlanId, PlanDescription, StartDateRules, BillingPeriod)] = List(
    (VoucherWeekend, PlanDescription("Weekend"), voucherSaturdayDateRules, Monthly),
    (VoucherSaturday, PlanDescription("Saturday"), voucherSaturdayDateRules, Monthly),
    (VoucherSunday, PlanDescription("Sunday"), voucherSundayDateRules, Monthly),
    (VoucherEveryDay, PlanDescription("Everyday"), voucherMondayRules, Monthly),
    (VoucherSixDay, PlanDescription("Sixday"), voucherMondayRules, Monthly),
    (VoucherWeekendPlus, PlanDescription("Weekend+"), voucherSaturdayDateRules, Monthly),
    (VoucherSaturdayPlus, PlanDescription("Saturday+"), voucherSaturdayDateRules, Monthly),
    (VoucherSundayPlus, PlanDescription("Sunday+"), voucherSundayDateRules, Monthly),
    (VoucherEveryDayPlus, PlanDescription("Everyday+"), voucherMondayRules, Monthly),
    (VoucherSixDayPlus, PlanDescription("Sixday+"), voucherMondayRules, Monthly),
  )

}

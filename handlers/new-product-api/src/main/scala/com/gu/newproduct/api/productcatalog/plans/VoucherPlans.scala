package com.gu.newproduct.api.productcatalog.plans

import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog._

import java.time.DayOfWeek.MONDAY
import java.time.{DayOfWeek, LocalDate}

class VoucherPlans(getStartDateFromFulfilmentFiles: (ProductType, List[DayOfWeek]) => LocalDate) {

  import PaperDays._

  private def windowRule(issueDays: List[DayOfWeek]) = {
    WindowRule(
      startDate = getStartDateFromFulfilmentFiles(ProductType.NewspaperVoucherBook, issueDays),
      maybeSize = Some(WindowSizeDays(35)),
    )
  }

  private def dateRules(allowedDays: List[DayOfWeek]) = StartDateRules(
    Some(DaysOfWeekRule(allowedDays)),
    windowRule(allowedDays),
  )

  private val mondayRules = dateRules(List(MONDAY))
  private val sundayDateRules = dateRules(sundayDays)
  private val saturdayDateRules = dateRules(saturdayDays)

  val planInfo: List[(PlanId, PlanDescription, StartDateRules, BillingPeriod)] = List(
    (VoucherWeekend, PlanDescription("Weekend"), saturdayDateRules, Monthly),
    (VoucherSaturday, PlanDescription("Saturday"), saturdayDateRules, Monthly),
    (VoucherSunday, PlanDescription("Sunday"), sundayDateRules, Monthly),
    (VoucherEveryDay, PlanDescription("Everyday"), mondayRules, Monthly),
    (VoucherSixDay, PlanDescription("Sixday"), mondayRules, Monthly),
    (VoucherWeekendPlus, PlanDescription("Weekend+"), saturdayDateRules, Monthly),
    (VoucherSaturdayPlus, PlanDescription("Saturday+"), saturdayDateRules, Monthly),
    (VoucherSundayPlus, PlanDescription("Sunday+"), sundayDateRules, Monthly),
    (VoucherEveryDayPlus, PlanDescription("Everyday+"), mondayRules, Monthly),
    (VoucherSixDayPlus, PlanDescription("Sixday+"), mondayRules, Monthly),
  )

}

package com.gu.newproduct.api.productcatalog.plans

import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog._

import java.time.{DayOfWeek, LocalDate}

class HomeDeliveryPlans(getStartDateFromFulfilmentFiles: (ProductType, List[DayOfWeek]) => LocalDate) {

  import PaperDays._
  private def windowRule(issueDays: List[DayOfWeek]) = WindowRule(
    startDate = getStartDateFromFulfilmentFiles(ProductType.NewspaperHomeDelivery, issueDays),
    maybeSize = Some(WindowSizeDays(28)),
  )

  private def dateRules(allowedDays: List[DayOfWeek]) = StartDateRules(
    Some(DaysOfWeekRule(allowedDays)),
    windowRule(allowedDays),
  )

  private val everyDayRules = dateRules(
    everyDayDays,
  )

  private val sixDayRules = dateRules(sixDayDays)
  private val sundayDateRules = dateRules(sundayDays)
  private val saturdayDateRules = dateRules(saturdayDays)
  private val weekendRules = dateRules(weekendDays)

  val planInfo: List[(PlanId, PlanDescription, StartDateRules, BillingPeriod)] = List(
    (HomeDeliveryEveryDay, PlanDescription("Everyday"), everyDayRules, Monthly),
    (HomeDeliverySixDay, PlanDescription("Sixday"), sixDayRules, Monthly),
    (HomeDeliveryWeekend, PlanDescription("Weekend"), weekendRules, Monthly),
    (HomeDeliverySunday, PlanDescription("Sunday"), sundayDateRules, Monthly),
    (HomeDeliverySaturday, PlanDescription("Saturday"), saturdayDateRules, Monthly),
    (HomeDeliveryEveryDayPlus, PlanDescription("Everyday+"), everyDayRules, Monthly),
    (HomeDeliverySixDayPlus, PlanDescription("Sixday+"), sixDayRules, Monthly),
    (HomeDeliveryWeekendPlus, PlanDescription("Weekend+"), weekendRules, Monthly),
    (HomeDeliverySundayPlus, PlanDescription("Sunday+"), sundayDateRules, Monthly),
    (HomeDeliverySaturdayPlus, PlanDescription("Saturday+"), saturdayDateRules, Monthly),
  )

}

package com.gu.newproduct.api.productcatalog.plans

import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog._

import java.time.{DayOfWeek, LocalDate}

class NationalDeliveryPlans(getStartDateFromFulfilmentFiles: (ProductType, List[DayOfWeek]) => LocalDate) {

  import PaperDays._
  private val SubscriptionStartDateWindowSize = WindowSizeDays(28)

  private def windowRule(issueDays: List[DayOfWeek]) = WindowRule(
    startDate = getStartDateFromFulfilmentFiles(ProductType.NewspaperNationalDelivery, issueDays),
    maybeSize = Some(SubscriptionStartDateWindowSize),
  )

  private def deliveryDateRules(allowedDays: List[DayOfWeek]) = StartDateRules(
    Some(DaysOfWeekRule(allowedDays)),
    windowRule(allowedDays),
  )

  private val everyDayRules = deliveryDateRules(everyDayDays)
  private val sixDayRules = deliveryDateRules(sixDayDays)
  private val weekendRules = deliveryDateRules(weekendDays)

  val planInfo: List[(PlanId, PlanDescription, StartDateRules, BillingPeriod)] = List(
    (NationalDeliveryEveryday, PlanDescription("Everyday"), everyDayRules, Monthly),
    (NationalDeliverySixday, PlanDescription("Sixday"), sixDayRules, Monthly),
    (NationalDeliveryWeekend, PlanDescription("Weekend"), weekendRules, Monthly),
  )

}

package com.gu.newproduct.api.productcatalog.plans

import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog._

import java.time.{DayOfWeek, LocalDate}

class HomeDeliveryPlans(
    getStartDateFromFulfilmentFiles: (ProductType, List[DayOfWeek]) => LocalDate,
) {

  import PaperDays._
  private val HomeDeliverySubscriptionStartDateWindowSize = WindowSizeDays(28)

  private def homeDeliveryWindowRule(issueDays: List[DayOfWeek]) = WindowRule(
    startDate = getStartDateFromFulfilmentFiles(ProductType.NewspaperHomeDelivery, issueDays),
    maybeSize = Some(HomeDeliverySubscriptionStartDateWindowSize),
  )

  private def homeDeliveryDateRules(allowedDays: List[DayOfWeek]) = StartDateRules(
    Some(DaysOfWeekRule(allowedDays)),
    homeDeliveryWindowRule(allowedDays),
  )

  private val homeDeliveryEveryDayRules = homeDeliveryDateRules(
    everyDayDays,
  )

  private val homeDeliverySixDayRules = homeDeliveryDateRules(sixDayDays)
  private val homeDeliverySundayDateRules = homeDeliveryDateRules(sundayDays)
  private val homeDeliverySaturdayDateRules = homeDeliveryDateRules(saturdayDays)
  private val homeDeliveryWeekendRules = homeDeliveryDateRules(weekendDays)

  val planInfo: List[(PlanId, PlanDescription, StartDateRules, BillingPeriod)] = List(
    (HomeDeliveryEveryDay, PlanDescription("Everyday"), homeDeliveryEveryDayRules, Monthly),
    (HomeDeliverySixDay, PlanDescription("Sixday"), homeDeliverySixDayRules, Monthly),
    (HomeDeliveryWeekend, PlanDescription("Weekend"), homeDeliveryWeekendRules, Monthly),
    (HomeDeliverySunday, PlanDescription("Sunday"), homeDeliverySundayDateRules, Monthly),
    (HomeDeliverySaturday, PlanDescription("Saturday"), homeDeliverySaturdayDateRules, Monthly),
    (HomeDeliveryEveryDayPlus, PlanDescription("Everyday+"), homeDeliveryEveryDayRules, Monthly),
    (HomeDeliverySixDayPlus, PlanDescription("Sixday+"), homeDeliverySixDayRules, Monthly),
    (HomeDeliveryWeekendPlus, PlanDescription("Weekend+"), homeDeliveryWeekendRules, Monthly),
    (HomeDeliverySundayPlus, PlanDescription("Sunday+"), homeDeliverySundayDateRules, Monthly),
    (HomeDeliverySaturdayPlus, PlanDescription("Saturday+"), homeDeliverySaturdayDateRules, Monthly),
  )

}

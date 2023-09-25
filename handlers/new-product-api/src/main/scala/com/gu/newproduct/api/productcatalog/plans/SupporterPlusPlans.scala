package com.gu.newproduct.api.productcatalog.plans

import com.gu.newproduct.api.productcatalog.PlanId.{AnnualSupporterPlus, MonthlySupporterPlus}
import com.gu.newproduct.api.productcatalog._

import java.time.LocalDate

class SupporterPlusPlans(today: LocalDate) {

  private val SupporterPlusStartDateWindowSize = WindowSizeDays(1)

  private val supporterPlusRule = StartDateRules(
    windowRule = WindowRule(
      startDate = today,
      maybeSize = Some(SupporterPlusStartDateWindowSize),
    ),
  )

  val planInfo: List[(PlanId, PlanDescription, StartDateRules, BillingPeriod)] = List(
    (MonthlySupporterPlus, PlanDescription("Monthly"), supporterPlusRule, Monthly),
    (AnnualSupporterPlus, PlanDescription("Annual"), supporterPlusRule, Annual),
  )

}

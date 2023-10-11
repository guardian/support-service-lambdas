package com.gu.newproduct.api.productcatalog.plans

import com.gu.newproduct.api.productcatalog.PlanId.{AnnualSupporterPlus, MonthlySupporterPlus}
import com.gu.newproduct.api.productcatalog._

import java.time.LocalDate

class SupporterPlusPlans(today: LocalDate) {

  private val rule = StartDateRules(
    windowRule = WindowRule(
      startDate = today,
      maybeSize = Some(WindowSizeDays(1)),
    ),
  )

  val planInfo: List[(PlanId, PlanDescription, StartDateRules, BillingPeriod)] = List(
    (MonthlySupporterPlus, PlanDescription("Monthly"), rule, Monthly),
    (AnnualSupporterPlus, PlanDescription("Annual"), rule, Annual),
  )

}

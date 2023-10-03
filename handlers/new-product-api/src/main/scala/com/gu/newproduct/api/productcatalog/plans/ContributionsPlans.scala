package com.gu.newproduct.api.productcatalog.plans

import com.gu.newproduct.api.productcatalog.PlanId.{AnnualContribution, MonthlyContribution}
import com.gu.newproduct.api.productcatalog._

import java.time.LocalDate

class ContributionsPlans(today: LocalDate) {

  private val rule = StartDateRules(
    windowRule = WindowRule(
      startDate = today,
      maybeSize = Some(WindowSizeDays(1)),
    ),
  )

  val planInfo: List[(PlanId, PlanDescription, StartDateRules, BillingPeriod)] = List(
    (MonthlyContribution, PlanDescription("Monthly"), rule, Monthly),
    (AnnualContribution, PlanDescription("Annual"), rule, Monthly),
  )

}

package com.gu.newproduct.api.productcatalog.plans

import com.gu.newproduct.api.productcatalog.PlanId.{AnnualContribution, MonthlyContribution}
import com.gu.newproduct.api.productcatalog._

import java.time.LocalDate

class ContributionsPlans(today: LocalDate) {

  private val ContributionStartDateWindowSize = WindowSizeDays(1)

  private val contributionsRule = StartDateRules(
    windowRule = WindowRule(
      startDate = today,
      maybeSize = Some(ContributionStartDateWindowSize),
    ),
  )

  val planInfo: List[(PlanId, PlanDescription, StartDateRules, BillingPeriod)] = List(
    (MonthlyContribution, PlanDescription("Monthly"), contributionsRule, Monthly),
    (AnnualContribution, PlanDescription("Annual"), contributionsRule, Monthly),
  )

}

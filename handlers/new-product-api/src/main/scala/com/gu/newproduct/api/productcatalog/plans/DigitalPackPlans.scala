package com.gu.newproduct.api.productcatalog.plans

import com.gu.newproduct.api.productcatalog.PlanId.{DigipackAnnual, DigipackMonthly}
import com.gu.newproduct.api.productcatalog._

import java.time.LocalDate

class DigitalPackPlans(today: LocalDate) {

  private val FreeTrialPeriodDays = 14

  private val startRules = StartDateRules(
    windowRule = WindowRule(
      startDate = today.plusDays(FreeTrialPeriodDays.toLong),
      maybeSize = Some(WindowSizeDays(90)),
    ),
  )

  val planInfo: List[(PlanId, PlanDescription, StartDateRules, BillingPeriod)] = List(
    (DigipackAnnual, PlanDescription("Annual"), startRules, Annual),
    (DigipackMonthly, PlanDescription("Monthly"), startRules, Monthly),
  )

}

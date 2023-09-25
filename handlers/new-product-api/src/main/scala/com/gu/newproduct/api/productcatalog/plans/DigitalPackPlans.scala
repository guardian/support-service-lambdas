package com.gu.newproduct.api.productcatalog.plans

import com.gu.newproduct.api.productcatalog.PlanId.{DigipackAnnual, DigipackMonthly}
import com.gu.newproduct.api.productcatalog._

import java.time.LocalDate

class DigitalPackPlans(today: LocalDate) {

  private val DigiPackFreeTrialPeriodDays = 14
  private val DigiPackStartDateWindowSize = WindowSizeDays(90)

  private val digiPackWindowRule = WindowRule(
    startDate = today.plusDays(DigiPackFreeTrialPeriodDays.toLong),
    maybeSize = Some(DigiPackStartDateWindowSize),
  )

  private val digipackStartRules = StartDateRules(
    windowRule = digiPackWindowRule,
  )

  val planInfo: List[(PlanId, PlanDescription, StartDateRules, BillingPeriod)] = List(
    (DigipackAnnual, PlanDescription("Annual"), digipackStartRules, Annual),
    (DigipackMonthly, PlanDescription("Monthly"), digipackStartRules, Monthly),
  )

}

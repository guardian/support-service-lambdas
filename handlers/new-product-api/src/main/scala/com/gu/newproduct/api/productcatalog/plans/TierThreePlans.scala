package com.gu.newproduct.api.productcatalog.plans

import com.gu.newproduct.api.productcatalog.PlanId.{TierThreeDomesticAnnual, TierThreeDomesticMonthly, TierThreeROWAnnual, TierThreeROWMonthly}
import com.gu.newproduct.api.productcatalog._

import java.time.{DayOfWeek, LocalDate}

class TierThreePlans(getStartDateFromFulfilmentFiles: (ProductType, List[DayOfWeek]) => LocalDate) {
  private val issueDays = List(DayOfWeek.FRIDAY)
  private val startDateRules =
    StartDateRules(
      daysOfWeekRule = Some(DaysOfWeekRule(issueDays)),
      windowRule = WindowRule(
        startDate = getStartDateFromFulfilmentFiles(ProductType.GuardianWeekly, issueDays),
        maybeSize = Some(WindowSizeDays(28)),
      ),
    )

  val planInfo: List[(PlanId, PlanDescription, StartDateRules, BillingPeriod)] = List(
    (
      TierThreeDomesticMonthly,
      PlanDescription("Tier Three - Monthly - Domestic"),
      startDateRules,
      Monthly,
    ),
    (
      TierThreeDomesticAnnual,
      PlanDescription("Tier Three - Annual - Domestic"),
      startDateRules,
      Annual,
    ),
    (
      TierThreeROWMonthly,
      PlanDescription("Tier Three - Monthly - ROW"),
      startDateRules,
      Monthly,
    ),
    (
      TierThreeROWAnnual,
      PlanDescription("Tier Three - Annual - ROW"),
      startDateRules,
      Annual,
    ),
  )
}

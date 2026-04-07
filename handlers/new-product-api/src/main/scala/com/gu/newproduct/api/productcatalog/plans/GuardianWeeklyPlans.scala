package com.gu.newproduct.api.productcatalog.plans

import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog._

import java.time.{DayOfWeek, LocalDate}

class GuardianWeeklyPlans(getStartDateFromFulfilmentFiles: (ProductType, List[DayOfWeek]) => LocalDate) {

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
      GuardianWeeklyPlusDomesticMonthly,
      PlanDescription("GW + Digital - Monthly - Domestic"),
      startDateRules,
      Monthly,
    ),
    (
      GuardianWeeklyPlusDomesticQuarterly,
      PlanDescription("GW + Digital - Quarterly - Domestic"),
      startDateRules,
      Quarterly,
    ),
    (
      GuardianWeeklyPlusDomesticAnnual,
      PlanDescription("GW + Digital - Annual - Domestic"),
      startDateRules,
      Annual,
    ),
    (
      GuardianWeeklyPlusROWMonthly,
      PlanDescription("GW + Digital - Monthly - ROW"),
      startDateRules,
      Monthly,
    ),
    (
      GuardianWeeklyPlusROWQuarterly,
      PlanDescription("GW + Digital - Quarterly - ROW"),
      startDateRules,
      Quarterly,
    ),
    (
      GuardianWeeklyPlusROWAnnual,
      PlanDescription("GW + Digital - Annual - ROW"),
      startDateRules,
      Annual,
    ),
  )

}

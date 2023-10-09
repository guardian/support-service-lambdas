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
      GuardianWeeklyDomestic6for6,
      PlanDescription("GW Oct 18 - Six for Six - Domestic"),
      startDateRules,
      SixWeeks,
    ),
    (
      GuardianWeeklyDomesticQuarterly,
      PlanDescription("GW Oct 18 - Quarterly - Domestic"),
      startDateRules,
      Quarterly,
    ),
    (
      GuardianWeeklyDomesticAnnual,
      PlanDescription("GW Oct 18 - Annual - Domestic"),
      startDateRules,
      Annual,
    ),
    (
      GuardianWeeklyROW6for6,
      PlanDescription("GW Oct 18 - Six for Six - ROW"),
      startDateRules,
      SixWeeks,
    ),
    (
      GuardianWeeklyROWQuarterly,
      PlanDescription("GW Oct 18 - Quarterly - ROW"),
      startDateRules,
      Quarterly,
    ),
    (
      GuardianWeeklyROWAnnual,
      PlanDescription("GW Oct 18 - Annual - ROW"),
      startDateRules,
      Annual,
    ),
  )

}

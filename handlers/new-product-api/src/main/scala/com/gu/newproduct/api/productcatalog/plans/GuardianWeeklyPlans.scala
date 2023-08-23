package com.gu.newproduct.api.productcatalog.plans

import com.gu.newproduct.api.productcatalog.PlanId._
import com.gu.newproduct.api.productcatalog._

import java.time.{DayOfWeek, LocalDate}

class GuardianWeeklyPlans(
    getStartDateFromFulfilmentFiles: (ProductType, List[DayOfWeek]) => LocalDate,
) {

  private val GuardianWeeklySubscriptionStartDateWindowSize = WindowSizeDays(28)

  private val guardianWeeklyIssueDays = List(DayOfWeek.FRIDAY)
  private val guardianWeeklyStartDateRules =
    StartDateRules(
      daysOfWeekRule = Some(DaysOfWeekRule(guardianWeeklyIssueDays)),
      windowRule = WindowRule(
        startDate = getStartDateFromFulfilmentFiles(ProductType.GuardianWeekly, guardianWeeklyIssueDays),
        maybeSize = Some(GuardianWeeklySubscriptionStartDateWindowSize),
      ),
    )

  val planInfo: List[(PlanId, PlanDescription, StartDateRules, BillingPeriod)] = List(
    (
      GuardianWeeklyDomestic6for6,
      PlanDescription("GW Oct 18 - Six for Six - Domestic"),
      guardianWeeklyStartDateRules,
      SixWeeks,
    ),
    (
      GuardianWeeklyDomesticQuarterly,
      PlanDescription("GW Oct 18 - Quarterly - Domestic"),
      guardianWeeklyStartDateRules,
      Quarterly,
    ),
    (
      GuardianWeeklyDomesticAnnual,
      PlanDescription("GW Oct 18 - Annual - Domestic"),
      guardianWeeklyStartDateRules,
      Annual,
    ),
    (
      GuardianWeeklyROW6for6,
      PlanDescription("GW Oct 18 - Six for Six - ROW"),
      guardianWeeklyStartDateRules,
      SixWeeks,
    ),
    (
      GuardianWeeklyROWQuarterly,
      PlanDescription("GW Oct 18 - Quarterly - ROW"),
      guardianWeeklyStartDateRules,
      Quarterly,
    ),
    (
      GuardianWeeklyROWAnnual,
      PlanDescription("GW Oct 18 - Annual - ROW"),
      guardianWeeklyStartDateRules,
      Annual,
    ),
  )

}

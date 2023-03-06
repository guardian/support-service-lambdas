package com.gu.holiday_stops

import java.time.LocalDate

case class IssueSpecifics(
    firstAvailableDate: LocalDate,
    issueDayOfWeek: Int,
)

object ActionCalculator {
  lazy val VoucherProcessorLeadTime: Int = 1
  lazy val GuardianWeeklyProcessorRunLeadTime = 8 + (1 /* safety-day */ )
}

package com.gu.supporter.fulfilment

import java.time.LocalDate
import org.scalatest.{FlatSpec, Matchers}

class FulfilmentDatesSpec extends FlatSpec with Matchers {
  "FulfilmentDates" should "be calculated for GuardianWeekly" in {
    val today = LocalDate.parse("2019-12-02")
    GuardianWeeklyFulfilmentDates(today).today should be(today)
    GuardianWeeklyFulfilmentDates(today).acquisitionsStartDate should be(LocalDate.parse("2019-12-13"))
    GuardianWeeklyFulfilmentDates(today).deliveryAddressChangeEffectiveDate should be(LocalDate.parse("2019-12-13"))
    GuardianWeeklyFulfilmentDates(today).holidayStopFirstAvailableDate should be(LocalDate.parse("2019-12-07"))
    GuardianWeeklyFulfilmentDates(today).finalFulfilmentFileGenerationDate should be(LocalDate.parse("2019-12-05"))
    GuardianWeeklyFulfilmentDates(today).nextAffectablePublicationDateOnFrontCover should be(LocalDate.parse("2019-12-13"))
  }
}

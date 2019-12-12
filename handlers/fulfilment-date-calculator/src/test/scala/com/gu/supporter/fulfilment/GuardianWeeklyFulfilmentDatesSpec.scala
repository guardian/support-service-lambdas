package com.gu.supporter.fulfilment

import org.scalatest.{FlatSpec, Matchers}

class GuardianWeeklyFulfilmentDatesSpec extends FlatSpec with Matchers with DateSupport {
  "GuardianWeeklyFulfilmentDates" should "calculate deliveryAddressChangeEffectiveDate" in {
    GuardianWeeklyFulfilmentDates("2019-12-02")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-13")
    GuardianWeeklyFulfilmentDates("2019-12-03")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-13")
    GuardianWeeklyFulfilmentDates("2019-12-04")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-13")
    GuardianWeeklyFulfilmentDates("2019-12-05")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-06")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-07")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-08")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-09")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-10")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-11")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-12")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-27")
    GuardianWeeklyFulfilmentDates("2019-12-13")("Friday").deliveryAddressChangeEffectiveDate should equalDate("2019-12-27")
  }

  it should "have nextAffectablePublicationDateOnFrontCover equal to deliveryAddressChangeEffectiveDate" in {
    GuardianWeeklyFulfilmentDates("2019-12-02")("Friday").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-02")("Friday").nextAffectablePublicationDateOnFrontCover)
    GuardianWeeklyFulfilmentDates("2019-12-03")("Friday").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-03")("Friday").nextAffectablePublicationDateOnFrontCover)
    GuardianWeeklyFulfilmentDates("2019-12-04")("Friday").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-04")("Friday").nextAffectablePublicationDateOnFrontCover)
    GuardianWeeklyFulfilmentDates("2019-12-05")("Friday").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-05")("Friday").nextAffectablePublicationDateOnFrontCover)
    GuardianWeeklyFulfilmentDates("2019-12-06")("Friday").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-06")("Friday").nextAffectablePublicationDateOnFrontCover)
    GuardianWeeklyFulfilmentDates("2019-12-07")("Friday").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-07")("Friday").nextAffectablePublicationDateOnFrontCover)
    GuardianWeeklyFulfilmentDates("2019-12-08")("Friday").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-08")("Friday").nextAffectablePublicationDateOnFrontCover)
    GuardianWeeklyFulfilmentDates("2019-12-09")("Friday").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-09")("Friday").nextAffectablePublicationDateOnFrontCover)
    GuardianWeeklyFulfilmentDates("2019-12-10")("Friday").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-10")("Friday").nextAffectablePublicationDateOnFrontCover)
    GuardianWeeklyFulfilmentDates("2019-12-11")("Friday").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-11")("Friday").nextAffectablePublicationDateOnFrontCover)
    GuardianWeeklyFulfilmentDates("2019-12-12")("Friday").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-12")("Friday").nextAffectablePublicationDateOnFrontCover)
    GuardianWeeklyFulfilmentDates("2019-12-13")("Friday").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-13")("Friday").nextAffectablePublicationDateOnFrontCover)
  }

  it should "calculate acquisitionsStartDate" in {
    GuardianWeeklyFulfilmentDates("2019-12-02")("Friday").acquisitionsStartDate should equalDate("2019-12-13")
    GuardianWeeklyFulfilmentDates("2019-12-03")("Friday").acquisitionsStartDate should equalDate("2019-12-13")
    GuardianWeeklyFulfilmentDates("2019-12-04")("Friday").acquisitionsStartDate should equalDate("2019-12-13")
    GuardianWeeklyFulfilmentDates("2019-12-05")("Friday").acquisitionsStartDate should equalDate("2019-12-13")
    GuardianWeeklyFulfilmentDates("2019-12-06")("Friday").acquisitionsStartDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-07")("Friday").acquisitionsStartDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-08")("Friday").acquisitionsStartDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-09")("Friday").acquisitionsStartDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-10")("Friday").acquisitionsStartDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-11")("Friday").acquisitionsStartDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-12")("Friday").acquisitionsStartDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-13")("Friday").acquisitionsStartDate should equalDate("2019-12-27")
  }

  it should "calculate holidayStopFirstAvailableDate" in {
    GuardianWeeklyFulfilmentDates("2019-12-02")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-07")
    GuardianWeeklyFulfilmentDates("2019-12-03")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-07")
    GuardianWeeklyFulfilmentDates("2019-12-04")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-14")
    GuardianWeeklyFulfilmentDates("2019-12-05")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-14")
    GuardianWeeklyFulfilmentDates("2019-12-06")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-14")
    GuardianWeeklyFulfilmentDates("2019-12-07")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-14")
    GuardianWeeklyFulfilmentDates("2019-12-08")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-14")
    GuardianWeeklyFulfilmentDates("2019-12-09")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-14")
    GuardianWeeklyFulfilmentDates("2019-12-10")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-14")
    GuardianWeeklyFulfilmentDates("2019-12-11")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-21")
    GuardianWeeklyFulfilmentDates("2019-12-12")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-21")
    GuardianWeeklyFulfilmentDates("2019-12-13")("Friday").holidayStopFirstAvailableDate should equalDate("2019-12-21")
  }

  it should "calculate finalFulfilmentFileGenerationDate" in {
    GuardianWeeklyFulfilmentDates("2019-12-02")("Friday").finalFulfilmentFileGenerationDate should equalDate("2019-12-05")
    GuardianWeeklyFulfilmentDates("2019-12-03")("Friday").finalFulfilmentFileGenerationDate should equalDate("2019-12-05")
    GuardianWeeklyFulfilmentDates("2019-12-04")("Friday").finalFulfilmentFileGenerationDate should equalDate("2019-12-05")
    GuardianWeeklyFulfilmentDates("2019-12-05")("Friday").finalFulfilmentFileGenerationDate should equalDate("2019-12-12")
    GuardianWeeklyFulfilmentDates("2019-12-06")("Friday").finalFulfilmentFileGenerationDate should equalDate("2019-12-12")
    GuardianWeeklyFulfilmentDates("2019-12-07")("Friday").finalFulfilmentFileGenerationDate should equalDate("2019-12-12")
    GuardianWeeklyFulfilmentDates("2019-12-08")("Friday").finalFulfilmentFileGenerationDate should equalDate("2019-12-12")
    GuardianWeeklyFulfilmentDates("2019-12-09")("Friday").finalFulfilmentFileGenerationDate should equalDate("2019-12-12")
    GuardianWeeklyFulfilmentDates("2019-12-10")("Friday").finalFulfilmentFileGenerationDate should equalDate("2019-12-12")
    GuardianWeeklyFulfilmentDates("2019-12-11")("Friday").finalFulfilmentFileGenerationDate should equalDate("2019-12-12")
    GuardianWeeklyFulfilmentDates("2019-12-12")("Friday").finalFulfilmentFileGenerationDate should equalDate("2019-12-19")
    GuardianWeeklyFulfilmentDates("2019-12-13")("Friday").finalFulfilmentFileGenerationDate should equalDate("2019-12-19")
  }
}

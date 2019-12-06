package com.gu.supporter.fulfilment

import org.scalatest.{FlatSpec, Matchers}

class GuardianWeeklyFulfilmentDatesSpec extends FlatSpec with Matchers with DateSupport {
  "GuardianWeeklyFulfilmentDates" should "calculate deliveryAddressChangeEffectiveDate" in {
    GuardianWeeklyFulfilmentDates("2019-12-02").deliveryAddressChangeEffectiveDate should equalDate("2019-12-13")
    GuardianWeeklyFulfilmentDates("2019-12-03").deliveryAddressChangeEffectiveDate should equalDate("2019-12-13")
    GuardianWeeklyFulfilmentDates("2019-12-04").deliveryAddressChangeEffectiveDate should equalDate("2019-12-13")
    GuardianWeeklyFulfilmentDates("2019-12-05").deliveryAddressChangeEffectiveDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-06").deliveryAddressChangeEffectiveDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-07").deliveryAddressChangeEffectiveDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-08").deliveryAddressChangeEffectiveDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-09").deliveryAddressChangeEffectiveDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-10").deliveryAddressChangeEffectiveDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-11").deliveryAddressChangeEffectiveDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-12").deliveryAddressChangeEffectiveDate should equalDate("2019-12-27")
    GuardianWeeklyFulfilmentDates("2019-12-13").deliveryAddressChangeEffectiveDate should equalDate("2019-12-27")
  }

  it should "have nextAffectablePublicationDateOnFrontCover equal to deliveryAddressChangeEffectiveDate" in {
    GuardianWeeklyFulfilmentDates("2019-12-02").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-02").nextAffectablePublicationDateOnFrontCover)
    GuardianWeeklyFulfilmentDates("2019-12-03").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-03").nextAffectablePublicationDateOnFrontCover)
    GuardianWeeklyFulfilmentDates("2019-12-04").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-04").nextAffectablePublicationDateOnFrontCover)
    GuardianWeeklyFulfilmentDates("2019-12-05").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-05").nextAffectablePublicationDateOnFrontCover)
    GuardianWeeklyFulfilmentDates("2019-12-06").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-06").nextAffectablePublicationDateOnFrontCover)
    GuardianWeeklyFulfilmentDates("2019-12-07").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-07").nextAffectablePublicationDateOnFrontCover)
    GuardianWeeklyFulfilmentDates("2019-12-08").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-08").nextAffectablePublicationDateOnFrontCover)
    GuardianWeeklyFulfilmentDates("2019-12-09").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-09").nextAffectablePublicationDateOnFrontCover)
    GuardianWeeklyFulfilmentDates("2019-12-10").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-10").nextAffectablePublicationDateOnFrontCover)
    GuardianWeeklyFulfilmentDates("2019-12-11").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-11").nextAffectablePublicationDateOnFrontCover)
    GuardianWeeklyFulfilmentDates("2019-12-12").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-12").nextAffectablePublicationDateOnFrontCover)
    GuardianWeeklyFulfilmentDates("2019-12-13").deliveryAddressChangeEffectiveDate should be(GuardianWeeklyFulfilmentDates("2019-12-13").nextAffectablePublicationDateOnFrontCover)
  }

  it should "calculate acquisitionsStartDate" in {
    GuardianWeeklyFulfilmentDates("2019-12-02").acquisitionsStartDate should equalDate("2019-12-13")
    GuardianWeeklyFulfilmentDates("2019-12-03").acquisitionsStartDate should equalDate("2019-12-13")
    GuardianWeeklyFulfilmentDates("2019-12-04").acquisitionsStartDate should equalDate("2019-12-13")
    GuardianWeeklyFulfilmentDates("2019-12-05").acquisitionsStartDate should equalDate("2019-12-13")
    GuardianWeeklyFulfilmentDates("2019-12-06").acquisitionsStartDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-07").acquisitionsStartDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-08").acquisitionsStartDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-09").acquisitionsStartDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-10").acquisitionsStartDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-11").acquisitionsStartDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-12").acquisitionsStartDate should equalDate("2019-12-20")
    GuardianWeeklyFulfilmentDates("2019-12-13").acquisitionsStartDate should equalDate("2019-12-27")
  }

  it should "calculate holidayStopFirstAvailableDate" in {
    GuardianWeeklyFulfilmentDates("2019-12-02").holidayStopFirstAvailableDate should equalDate("2019-12-07")
    GuardianWeeklyFulfilmentDates("2019-12-03").holidayStopFirstAvailableDate should equalDate("2019-12-07")
    GuardianWeeklyFulfilmentDates("2019-12-04").holidayStopFirstAvailableDate should equalDate("2019-12-14")
    GuardianWeeklyFulfilmentDates("2019-12-05").holidayStopFirstAvailableDate should equalDate("2019-12-14")
    GuardianWeeklyFulfilmentDates("2019-12-06").holidayStopFirstAvailableDate should equalDate("2019-12-14")
    GuardianWeeklyFulfilmentDates("2019-12-07").holidayStopFirstAvailableDate should equalDate("2019-12-14")
    GuardianWeeklyFulfilmentDates("2019-12-08").holidayStopFirstAvailableDate should equalDate("2019-12-14")
    GuardianWeeklyFulfilmentDates("2019-12-09").holidayStopFirstAvailableDate should equalDate("2019-12-14")
    GuardianWeeklyFulfilmentDates("2019-12-10").holidayStopFirstAvailableDate should equalDate("2019-12-14")
    GuardianWeeklyFulfilmentDates("2019-12-11").holidayStopFirstAvailableDate should equalDate("2019-12-21")
    GuardianWeeklyFulfilmentDates("2019-12-12").holidayStopFirstAvailableDate should equalDate("2019-12-21")
    GuardianWeeklyFulfilmentDates("2019-12-13").holidayStopFirstAvailableDate should equalDate("2019-12-21")
  }

  //  it should "calculate finalFulfilmentFileGenerationDate" in {
  //    GuardianWeeklyFulfilmentDates("2019-12-02").finalFulfilmentFileGenerationDate should equalDate("2019-12-05")
  //    GuardianWeeklyFulfilmentDates("2019-12-03").finalFulfilmentFileGenerationDate should equalDate("2019-12-05")
  //    GuardianWeeklyFulfilmentDates("2019-12-04").finalFulfilmentFileGenerationDate should equalDate("2019-12-05")
  //    GuardianWeeklyFulfilmentDates("2019-12-05").finalFulfilmentFileGenerationDate should equalDate("2019-12-12")
  //    GuardianWeeklyFulfilmentDates("2019-12-06").finalFulfilmentFileGenerationDate should equalDate("2019-12-12")
  //    GuardianWeeklyFulfilmentDates("2019-12-07").finalFulfilmentFileGenerationDate should equalDate("2019-12-12")
  //    GuardianWeeklyFulfilmentDates("2019-12-08").finalFulfilmentFileGenerationDate should equalDate("2019-12-12")
  //    GuardianWeeklyFulfilmentDates("2019-12-09").finalFulfilmentFileGenerationDate should equalDate("2019-12-12")
  //    GuardianWeeklyFulfilmentDates("2019-12-10").finalFulfilmentFileGenerationDate should equalDate("2019-12-12")
  //    GuardianWeeklyFulfilmentDates("2019-12-11").finalFulfilmentFileGenerationDate should equalDate("2019-12-12")
  //    GuardianWeeklyFulfilmentDates("2019-12-12").finalFulfilmentFileGenerationDate should equalDate("2019-12-19")
  //    GuardianWeeklyFulfilmentDates("2019-12-13").finalFulfilmentFileGenerationDate should equalDate("2019-12-19")
  //  }
}

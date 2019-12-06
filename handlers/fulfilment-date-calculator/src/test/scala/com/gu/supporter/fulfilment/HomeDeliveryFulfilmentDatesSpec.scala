package com.gu.supporter.fulfilment

import org.scalatest.{FlatSpec, Matchers}

class HomeDeliveryFulfilmentDatesSpec extends FlatSpec with Matchers with DateSupport {
  "Everyday" should "calculate fulfilment dates" in {
    HomeDeliveryFulfilmentDates("2019-12-02", Everyday).deliveryAddressChangeEffectiveDate should equalDate("2019-12-05")
    HomeDeliveryFulfilmentDates("2019-12-02", Everyday).holidayStopFirstAvailableDate should equalDate("2019-12-05")
    HomeDeliveryFulfilmentDates("2019-12-02", Everyday).nextAffectablePublicationDateOnFrontCover should equalDate("2019-12-05")
    HomeDeliveryFulfilmentDates("2019-12-02", Everyday).acquisitionsStartDate should equalDate("2019-12-05")
  }

  "Saturday" should "calculate fulfilment dates" in {
    HomeDeliveryFulfilmentDates("2019-12-02", Saturday).deliveryAddressChangeEffectiveDate should equalDate("2019-12-07")
    HomeDeliveryFulfilmentDates("2019-12-02", Saturday).holidayStopFirstAvailableDate should equalDate("2019-12-07")
    HomeDeliveryFulfilmentDates("2019-12-02", Saturday).nextAffectablePublicationDateOnFrontCover should equalDate("2019-12-07")
    HomeDeliveryFulfilmentDates("2019-12-02", Saturday).acquisitionsStartDate should equalDate("2019-12-07")
  }

}

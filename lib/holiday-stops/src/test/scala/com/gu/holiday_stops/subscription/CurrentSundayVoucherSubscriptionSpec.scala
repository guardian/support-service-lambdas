package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.Fixtures
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import org.scalactic.TypeCheckedTripleEquals
import org.scalatest._

class CurrentSundayVoucherSubscriptionSpec extends FlatSpec with Matchers with EitherValues with TypeCheckedTripleEquals {
  "CurrentSundayVoucherSubscription" should "satisfy all the predicates" in {
    val subscription = Fixtures.subscriptionFromJson("SundayVoucherSubscription.json")
    val currentSundayVoucherSubscription = VoucherSubscription(subscription, StoppedPublicationDate(LocalDate.parse("2019-10-27")))
    currentSundayVoucherSubscription.right.value.dayOfWeek should ===(VoucherDayOfWeek.Sunday)
  }

  it should "fail on missing invoice" in {
    val subscription = Fixtures.subscriptionFromJson("SundayVoucherSubscriptionMissingInvoice.json")
    val currentSundayVoucherSubscription = VoucherSubscription(subscription, StoppedPublicationDate(LocalDate.parse("2019-10-27")))
    currentSundayVoucherSubscription.isLeft should ===(true)
  }
}

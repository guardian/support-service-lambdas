package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.Fixtures
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import org.scalactic.TypeCheckedTripleEquals
import org.scalatest._

class CurrentWeekendVoucherSubscriptionSpec extends FlatSpec with Matchers with EitherValues with TypeCheckedTripleEquals {
  "CurrentWeekendVoucherSubscription" should "satisfy all the predicates" in {
    val subscription = Fixtures.subscriptionFromJson("WeekendVoucherSubscription.json")
    val model = VoucherSubscription(subscription, StoppedPublicationDate(LocalDate.parse("2019-10-26"))).right.value
    model.dayOfWeek should ===(VoucherDayOfWeek.Saturday)
    model.price should ===(10.56)
  }

  it should "fail if stoppedPublicationDate falls outside invoiced period" in {
    val subscription = Fixtures.subscriptionFromJson("WeekendVoucherSubscription.json")
    val model = VoucherSubscription(subscription, StoppedPublicationDate(LocalDate.parse("2019-09-01")))
    model.isLeft should ===(true)
  }

  it should "fail if stoppedPublicationDate falls outside weekend" in {
    val subscription = Fixtures.subscriptionFromJson("WeekendVoucherSubscription.json")
    val model = VoucherSubscription(subscription, StoppedPublicationDate(LocalDate.parse("2019-10-28")))
    model.isLeft should ===(true)
  }
}

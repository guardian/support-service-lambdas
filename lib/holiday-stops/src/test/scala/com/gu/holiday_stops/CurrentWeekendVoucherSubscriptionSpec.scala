package com.gu.holiday_stops

import java.time.LocalDate

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import io.circe.generic.auto._
import io.circe.parser.decode
import org.scalatest._

import scala.io.Source

class CurrentWeekendVoucherSubscriptionSpec extends FlatSpec with Matchers with EitherValues {
  "CurrentWeekendVoucherSubscription" should "satisfy all the predicates" in {
    val subscriptionRaw = Source.fromResource("WeekendVoucherSubscription.json").mkString
    val subscription = decode[Subscription](subscriptionRaw).getOrElse(fail("Could not decode CurrentWeekendVoucherSubscription"))
    val model = CurrentWeekendVoucherSubscription(subscription, WeekendVoucherHolidayStopConfig.Dev.productRatePlanId, StoppedPublicationDate(LocalDate.parse("2019-09-28"))).right.value
    model.productRatePlanId should be(WeekendVoucherHolidayStopConfig.Dev.productRatePlanId)
    model.dayOfWeek should be("Saturday")
    model.price should be(10.56)
  }

  it should "fail if stoppedPublicationDate does not fall on weekend" in {
    val subscriptionRaw = Source.fromResource("WeekendVoucherSubscription.json").mkString
    val subscription = decode[Subscription](subscriptionRaw).getOrElse(fail("Could not decode CurrentWeekendVoucherSubscription"))
    val model = CurrentWeekendVoucherSubscription(subscription, WeekendVoucherHolidayStopConfig.Dev.productRatePlanId, StoppedPublicationDate(LocalDate.parse("2019-09-27")))
    model.isLeft should be(false)
  }
}

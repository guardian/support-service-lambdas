package com.gu.holiday_stops

import org.scalatest._
import scala.io.Source
import io.circe.parser.decode
import io.circe.generic.auto._

class CurrentSundayVoucherSubscriptionSpec extends FlatSpec with Matchers with EitherValues {
  "CurrentSundayVoucherSubscription" should "satisfy all the predicates" in {
    val subscripitonRaw = Source.fromURL(getClass.getResource("/SundayVoucherSubscription.json")).mkString
    val subscription = decode[Subscription](subscripitonRaw).getOrElse(fail("Could not decode CurrentSundayVoucherSubscription"))
    val currentSundayVoucherSubscription = CurrentSundayVoucherSubscription(subscription, SundayVoucherHolidayStopConfig.Dev.productRatePlanChargeId)
    currentSundayVoucherSubscription.right.value.productRatePlanChargeId should be("2c92c0f95aff3b56015b1045fba832d4")
  }

  it should "fail on missing invoice" in {
    val subscripitonRaw = Source.fromURL(getClass.getResource("/SundayVoucherSubscriptionMissingInvoice.json")).mkString
    val subscription = decode[Subscription](subscripitonRaw).getOrElse(fail("Could not decode CurrentSundayVoucherSubscription"))
    val currentSundayVoucherSubscription = CurrentSundayVoucherSubscription(subscription, SundayVoucherHolidayStopConfig.Dev.productRatePlanChargeId)
    currentSundayVoucherSubscription.isLeft should be(true)
  }
}

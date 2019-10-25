package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holiday_stops.subscription.{StoppedProduct, Subscription, VoucherDayOfWeek, VoucherSubscription}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import org.scalatest._

import scala.io.Source
import io.circe.parser.decode
import io.circe.generic.auto._

class SundayVoucherNextBillingPeriodStartDateSpec extends FlatSpec with Matchers with EitherValues with Inside {
  "CurrentSundayVoucherSubscription" should "satisfy all the predicates" in {
    val subscriptionRaw = Source.fromResource("SundayVoucherSubscription.json").mkString
    val subscription = decode[Subscription](subscriptionRaw).getOrElse(fail("Could not decode CurrentSundayVoucherSubscription"))
    val stoppedProduct = StoppedProduct(subscription, StoppedPublicationDate(LocalDate.parse("2019-10-27"))).right.value
    stoppedProduct shouldBe a[VoucherSubscription]
    stoppedProduct should matchPattern { case VoucherSubscription(_, _, _, _, _, _, VoucherDayOfWeek.Sunday) => }
    stoppedProduct.credit.invoiceDate should be(LocalDate.of(2019, 11, 6))
  }
}

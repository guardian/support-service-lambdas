package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import io.circe.generic.auto._
import io.circe.parser.decode
import org.scalatest._
import scala.io.Source

class GuardianWeeklyNforNSpec extends FlatSpec with Matchers with EitherValues {
  private val nForNChargedThroughDate = LocalDate.parse("2019-11-15")
  "GuardianWeeklySubscription" should "represent N-for-N when stopped publication date falls within N-for-N" in {
    val subscriptionRaw = Source.fromResource("GuardianWeeklyWith6For6.json").mkString
    val subscription = decode[Subscription](subscriptionRaw).getOrElse(fail("Could not decode GuardianWeeklySubscription"))
    val currentSundayVoucherSubscription = GuardianWeeklySubscription(subscription, StoppedPublicationDate(LocalDate.parse("2019-10-04")))
    currentSundayVoucherSubscription.right.value.price should be(6)
  }

  it should "represent regular GW when stopped publication date falls after N-for-N" in {
    val subscriptionRaw = Source.fromResource("GuardianWeeklyWith6For6.json").mkString
    val subscription = decode[Subscription](subscriptionRaw).getOrElse(fail("Could not decode GuardianWeeklySubscription"))
    val currentSundayVoucherSubscription = GuardianWeeklySubscription(subscription, StoppedPublicationDate(nForNChargedThroughDate))
    currentSundayVoucherSubscription.right.value.price should be(37.5)
  }

  it should "should fail if stopped publication date is before current invoiced period start date " in {
    val subscriptionRaw = Source.fromResource("GuardianWeeklyWith6For6.json").mkString
    val subscription = decode[Subscription](subscriptionRaw).getOrElse(fail("Could not decode GuardianWeeklySubscription"))
    val currentSundayVoucherSubscription = GuardianWeeklySubscription(subscription, StoppedPublicationDate(LocalDate.parse("2019-05-04").minusDays(1)))
    currentSundayVoucherSubscription.isLeft should be(true)
  }
}

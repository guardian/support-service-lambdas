package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.Fixtures
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import org.scalactic.TypeCheckedTripleEquals
import org.scalatest._

class GuardianWeeklyNforNSpec extends FlatSpec with Matchers with EitherValues with TypeCheckedTripleEquals {
  private val nForNChargedThroughDate = LocalDate.parse("2019-11-15")
  "GuardianWeeklySubscription" should "represent N-for-N when stopped publication date falls within N-for-N" in {
    val subscription = Fixtures.subscriptionFromJson("GuardianWeeklyWith6For6.json")
    val currentSundayVoucherSubscription = GuardianWeeklySubscription(subscription, StoppedPublicationDate(LocalDate.parse("2019-10-04")))
    currentSundayVoucherSubscription.right.value.price should ===(6.00)
  }

  it should "represent regular GW when stopped publication date falls after N-for-N" in {
    val subscription = Fixtures.subscriptionFromJson("GuardianWeeklyWith6For6.json")
    val currentSundayVoucherSubscription = GuardianWeeklySubscription(subscription, StoppedPublicationDate(nForNChargedThroughDate))
    currentSundayVoucherSubscription.right.value.price should ===(37.50)
  }

  it should "should fail if stopped publication date is before current invoiced period start date " in {
    val subscription = Fixtures.subscriptionFromJson("GuardianWeeklyWith6For6.json")
    val currentSundayVoucherSubscription = GuardianWeeklySubscription(subscription, StoppedPublicationDate(LocalDate.parse("2019-05-04").minusDays(1)))
    currentSundayVoucherSubscription.isLeft should ===(true)
  }
}

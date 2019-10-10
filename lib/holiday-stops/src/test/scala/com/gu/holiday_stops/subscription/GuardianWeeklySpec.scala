package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.Fixtures
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import org.scalactic.TypeCheckedTripleEquals
import org.scalatest._

class GuardianWeeklySpec extends FlatSpec with Matchers with EitherValues with TypeCheckedTripleEquals {

  private val nForNChargedThroughDate = LocalDate.parse("2019-11-15")

  "GuardianWeeklySubscription" should "represent N-for-N when stopped publication date falls within N-for-N" in {
    val zuoraSubscription = Fixtures.subscriptionFromJson("GuardianWeeklyWith6For6.json")
    val gwSubscription = GuardianWeeklySubscription(zuoraSubscription, StoppedPublicationDate(LocalDate.parse("2019-10-04")))
    gwSubscription.right.value.price should ===(6.00)
  }

  it should "represent regular GW when stopped publication date falls after N-for-N" in {
    val zuoraSubscription = Fixtures.subscriptionFromJson("GuardianWeeklyWith6For6.json")
    val gwSubscription = GuardianWeeklySubscription(zuoraSubscription, StoppedPublicationDate(nForNChargedThroughDate))
    gwSubscription.right.value.price should ===(37.50)
  }

  it should "should fail if stopped publication date is before current invoiced period start date " in {
    val zuoraSubscription = Fixtures.subscriptionFromJson("GuardianWeeklyWith6For6.json")
    val gwSubscription = GuardianWeeklySubscription(zuoraSubscription, StoppedPublicationDate(LocalDate.parse("2019-05-04").minusDays(1)))
    gwSubscription.isLeft should ===(true)
  }

  it should "calculate correct credit amount when sub includes an expired GW rate plan" in {
    val zuoraSubscription = Fixtures.subscriptionFromJson("GuardianWeeklyOldSubscription.json")
    val gwSubscription = GuardianWeeklySubscription(
      zuoraSubscription,
      StoppedPublicationDate(LocalDate.parse("2019-10-18"))
    )
    gwSubscription.right.value.credit.amount should ===(-6.16)
  }
}

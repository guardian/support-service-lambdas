package com.gu.holiday_stops.subscription

import java.time.LocalDate

import com.gu.holiday_stops.Fixtures
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.StoppedPublicationDate
import org.scalactic.TypeCheckedTripleEquals
import org.scalatest._

class FulfilmentStartDateSpec extends FlatSpec with Matchers with EitherValues with TypeCheckedTripleEquals {

  "Subscription" should "be able to calculate the 'fulfilment start date' based on the 'effectiveStartDate's of all its Rate Plans" in {

    withClue("not correct for 6for6 GW :") {
      Fixtures.subscriptionFromJson("GuardianWeeklyWith6For6.json").fulfilmentStartDate shouldEqual LocalDate.parse("2019-10-04")
    }

    withClue("not correct for Voucher :") {
      Fixtures.subscriptionFromJson("SundayVoucherSubscriptionMissingInvoice.json").fulfilmentStartDate shouldEqual LocalDate.parse("2019-10-06")
    }

    withClue("did not fall-back to 'customerAcceptanceDate' if it's bizarrely earlier than any of the 'effectiveStartDate's :") {
      Fixtures.subscriptionFromJson("GuardianWeeklyWith6For6.json").fulfilmentStartDate shouldEqual LocalDate.parse("2019-10-04")
    }

  }
}

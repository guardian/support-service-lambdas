package com.gu.zuora.subscription

import java.time.LocalDate
import org.scalactic.TypeCheckedTripleEquals
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class DiscountTest extends AnyFlatSpec with Matchers with EitherValues with TypeCheckedTripleEquals {
  "Credit calculation" should "take into account discounts" in {
    MutableCalendar.setFakeToday(Some(LocalDate.parse("2019-10-04")))
    val subscription = Fixtures.subscriptionFromJson("Discounts.json")
    val account = Fixtures.mkAccount()
    val subscriptionData = SubscriptionData(subscription, account).right.value.subscriptionIssueData
    subscriptionData.issueDataForDate(LocalDate.parse("2020-02-28")).right.value.credit should ===(-1.74)
    subscriptionData.issueDataForDate(LocalDate.parse("2020-03-06")).right.value.credit should ===(-1.39)
  }
}

package com.gu.digitalSubscriptionExpiry

import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.{AccountId, AccountSummaryResult}
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription._
import org.joda.time.DateTime
import org.scalatest.FlatSpec
import org.scalatest.Matchers._

class SubscriptionServiceTest extends FlatSpec {
  val lastWeek = DateTime.now().minusWeeks(1)
  val nextWeek = lastWeek.plusWeeks(2)

  val digitalPack = SubscriptionResult(
    id = SubscriptionId("subId"),
    name = SubscriptionName("subName"),
    accountId = AccountId("accountId"),
    casActivationDate = None,
    customerAcceptanceDate = Some(lastWeek),
    startDate = Some(lastWeek),
    endDate = Some(nextWeek),
    ratePlans = List(RatePlan("Digital Pack"))
  )

  val monthlyContribution = digitalPack.copy(
    ratePlans = List(RatePlan("Monthly Contribution"))
  )

  val accountSummary = AccountSummaryResult(
    accountId = AccountId("accountId"),
    billToLastName = "LastName",
    billToPostcode = "abc 123",
    soldToLastName = "LastName",
    soldToPostcode = "123 abc"
  )
  val service = new SubscriptionService

  "getExpiryDateForValidSubscription" should "return the expiry date for a subscription" in {
    val maybeExpiryDate = service.getExpiryDateForValidSubscription(digitalPack, accountSummary, "abc 123")

    maybeExpiryDate should equal(Some(nextWeek))
  }

  it should "return None if the sub isn't a digital pack" in {
    val maybeExpiryDate = service.getExpiryDateForValidSubscription(monthlyContribution, accountSummary, "abc 123")

    maybeExpiryDate should equal(None)
  }

  it should "return None if the password check fails" in {
    val maybeExpiryDate = service.getExpiryDateForValidSubscription(digitalPack, accountSummary, "complete nonsense")

    maybeExpiryDate should equal(None)
  }

}

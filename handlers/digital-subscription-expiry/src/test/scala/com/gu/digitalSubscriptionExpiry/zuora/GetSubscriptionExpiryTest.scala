package com.gu.digitalSubscriptionExpiry.zuora

import com.gu.digitalSubscriptionExpiry.{Expiry, ExpiryType, SuccessResponse}
import com.gu.digitalSubscriptionExpiry.common.CommonApiResponses.apiResponse
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.{AccountId, AccountSummaryResult}
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription._
import org.joda.time.LocalDate
import org.scalatest.FlatSpec
import org.scalatest.Matchers._
import scalaz.-\/

class GetSubscriptionExpiryTest extends FlatSpec {
  val lastWeek = LocalDate.now().minusWeeks(1)
  val nextWeek = lastWeek.plusWeeks(2)

  val digitalPack = SubscriptionResult(
    id = SubscriptionId("subId"),
    name = SubscriptionName("subName"),
    accountId = AccountId("accountId"),
    casActivationDate = None,
    customerAcceptanceDate = lastWeek,
    startDate = lastWeek,
    endDate = nextWeek,
    ratePlans = List(RatePlan("Digital Pack", List(RatePlanCharge("Digital Pack Monthly", lastWeek, nextWeek))))
  )

  val monthlyContribution = digitalPack.copy(
    ratePlans = List(RatePlan("Monthly Contribution", List(RatePlanCharge("Montly Contribution", lastWeek, nextWeek))))
  )

  val accountSummary = AccountSummaryResult(
    accountId = AccountId("accountId"),
    billToLastName = "billingLastName",
    billToPostcode = "bill 123",
    soldToLastName = "SoldLastName",
    soldToPostcode = "123 sold"
  )

  val expectedResponse = {
    val expiry = SuccessResponse(Expiry(
      expiryDate = nextWeek,
      expiryType = ExpiryType.SUB,
      subscriptionCode = None,
      provider = None
    ))
    -\/(apiResponse(expiry, "200"))
  }

  it should "return the expiry date for a subscription using billing last name" in {
    val actualResponse = GetSubscriptionExpiry("billingLastName", digitalPack, accountSummary)
    actualResponse shouldEqual expectedResponse
  }

  it should "return the expiry date for a subscription using billing postcode" in {
    val actualResponse = GetSubscriptionExpiry("bill 123", digitalPack, accountSummary)
    actualResponse shouldEqual expectedResponse
  }

  it should "return the expiry date for a subscription using sold to last name" in {
    val actualResponse = GetSubscriptionExpiry("SoldLastName", digitalPack, accountSummary)
    actualResponse shouldEqual expectedResponse
  }

  it should "return the expiry date for a subscription using sold to postcode" in {
    val actualResponse = GetSubscriptionExpiry("123 sold", digitalPack, accountSummary)
    actualResponse shouldEqual expectedResponse
  }

  it should "ignore non alphanumerical characters in password" in {
    val actualResponse = GetSubscriptionExpiry("123-sold", digitalPack, accountSummary)
    actualResponse shouldEqual expectedResponse
  }

  //  it should "return None if the sub isn't a digital pack" in {
  //    val maybeExpiryDate = service.getExpiryDateForValidSubscription(monthlyContribution, accountSummary)
  //
  //    maybeExpiryDate should equal(None)
  //  }
  //TODO SEE IF WE REFACTOR WHERE THE PASSWORD IS CHECKED OR ELSE JUST ADD A TEST FOR THE PASSWORD CHECKING CODE HERE
  //  it should "return None if the password check fails" in {
  //    val maybeExpiryDate = service.getExpiryDateForValidSubscription(digitalPack, accountSummary)
  //
  //    maybeExpiryDate should equal(None)
  //  }

}

package com.gu.digitalSubscriptionExpiry.zuora

import com.gu.digitalSubscriptionExpiry._
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

  val notFoundResponse = -\/(apiResponse(ErrorResponse("Unknown subscriber", -90), "404"))

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

  it should "recognise digital charges with name set to digipack" in {

    val twoWeeksFromNow = nextWeek.plusWeeks(1)
    val charges = List(
      RatePlanCharge("DigiPack", lastWeek, nextWeek),
      RatePlanCharge("Saturday", lastWeek, twoWeeksFromNow),
      RatePlanCharge("Sunday", lastWeek, twoWeeksFromNow)
    )

    val digiPackSub = SubscriptionResult(
      id = SubscriptionId("subId"),
      name = SubscriptionName("subName"),
      accountId = AccountId("accountId"),
      casActivationDate = None,
      customerAcceptanceDate = lastWeek,
      startDate = lastWeek,
      endDate = nextWeek,
      ratePlans = List(RatePlan("Weekend+", charges))
    )

    val actualResponse = GetSubscriptionExpiry("123-sold", digiPackSub, accountSummary)
    actualResponse shouldEqual expectedResponse
  }

  it should "return not found for invalid password" in {
    val actualResponse = GetSubscriptionExpiry("invalid password", digitalPack, accountSummary)
    actualResponse shouldEqual notFoundResponse
  }

  it should "return not found for expired subscription" in {

    val lastYear = lastWeek.minusYears(1)
    val expiredDigitalPack = SubscriptionResult(
      id = SubscriptionId("subId"),
      name = SubscriptionName("subName"),
      accountId = AccountId("accountId"),
      casActivationDate = None,
      customerAcceptanceDate = lastYear,
      startDate = lastYear,
      endDate = lastWeek,
      ratePlans = List(RatePlan("Digital Pack", List(RatePlanCharge("Digital Pack Monthly", lastYear, lastWeek))))
    )

    val actualResponse = GetSubscriptionExpiry("123-sold", expiredDigitalPack, accountSummary)
    actualResponse shouldEqual notFoundResponse
  }

}

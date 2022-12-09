package com.gu.digitalSubscriptionExpiry.zuora

import java.time.LocalDate

import com.gu.digitalSubscriptionExpiry.responses.{ErrorResponse, Expiry, ExpiryType, SuccessResponse}
import com.gu.digitalSubscriptionExpiry.zuora.GetAccountSummary.{AccountId, AccountSummaryResult}
import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription._
import com.gu.util.apigateway.ApiGatewayResponse
import org.scalatest.matchers.should.Matchers._
import org.scalatest.matchers
import org.scalatest.flatspec.AnyFlatSpec

class GetSubscriptionExpiryTest extends AnyFlatSpec {
  val lastWeek = LocalDate.of(2018, 4, 11)
  val nextWeek = LocalDate.of(2018, 4, 25)
  val subEndDate = LocalDate.of(2018, 4, 20)
  val digitalPack = SubscriptionResult(
    id = SubscriptionId("subId"),
    name = SubscriptionName("subName"),
    accountId = AccountId("accountId"),
    casActivationDate = None,
    customerAcceptanceDate = lastWeek,
    startDate = lastWeek,
    endDate = subEndDate,
    ratePlans = List(RatePlan("Digital Pack", List(RatePlanCharge("Digital Pack Monthly", lastWeek, nextWeek)))),
  )

  val monthlyContribution = digitalPack.copy(
    ratePlans = List(RatePlan("Monthly Contribution", List(RatePlanCharge("Montly Contribution", lastWeek, nextWeek)))),
  )

  val newspaperHomeDelivery = digitalPack.copy(
    ratePlans = List(RatePlan("Newspaper Delivery", List(RatePlanCharge("Sunday", lastWeek, nextWeek)))),
  )
  val newspaperVoucher = digitalPack.copy(
    ratePlans = List(RatePlan("Newspaper Voucher", List(RatePlanCharge("Sunday", lastWeek, nextWeek)))),
  )

  val accountSummary = AccountSummaryResult(
    accountId = AccountId("accountId"),
    billToLastName = "billingLastName",
    billToPostcode = Some("bill 123"),
    soldToLastName = "SoldLastName",
    soldToPostcode = Some("123 sold"),
    identityId = Some("12345"),
  )

  val expectedResponse = {
    val expiry = SuccessResponse(
      Expiry(
        expiryDate = subEndDate.plusDays(1),
        expiryType = ExpiryType.SUB,
        subscriptionCode = None,
        provider = None,
      ),
    )
    ApiGatewayResponse("200", expiry)
  }

  val notFoundResponse = ApiGatewayResponse("404", ErrorResponse("Unknown subscriber", -90))
  val today: () => LocalDate = () => LocalDate.of(2018, 4, 18)

  it should "return the expiry date for a subscription using billing last name" in {
    val actualResponse = GetSubscriptionExpiry(today)("billingLastName", digitalPack, accountSummary)
    actualResponse shouldEqual expectedResponse
  }

  it should "return the expiry date for a subscription using billing postcode" in {
    val actualResponse = GetSubscriptionExpiry(today)("bill 123", digitalPack, accountSummary)
    actualResponse shouldEqual expectedResponse
  }

  it should "return the expiry date for a subscription using sold to last name" in {
    val actualResponse = GetSubscriptionExpiry(today)("SoldLastName", digitalPack, accountSummary)
    actualResponse shouldEqual expectedResponse
  }

  it should "return the expiry date for a subscription using sold to postcode" in {
    val actualResponse = GetSubscriptionExpiry(today)("123 sold", digitalPack, accountSummary)
    actualResponse shouldEqual expectedResponse
  }

  it should "return the expiry date for a subscription on its first day" in {
    val actualResponse = GetSubscriptionExpiry(() => lastWeek)("billingLastName", digitalPack, accountSummary)
    actualResponse shouldEqual expectedResponse
  }

  it should "ignore non alphanumerical characters in password" in {
    val actualResponse = GetSubscriptionExpiry(today)("123-sold", digitalPack, accountSummary)
    actualResponse shouldEqual expectedResponse
  }

  it should "recognise digital charges with name set to digipack" in {

    val twoWeeksFromNow = nextWeek.plusWeeks(1)
    val charges = List(
      RatePlanCharge("DigiPack", lastWeek, nextWeek),
      RatePlanCharge("Saturday", lastWeek, twoWeeksFromNow),
      RatePlanCharge("Sunday", lastWeek, twoWeeksFromNow),
    )

    val digiPackSub = SubscriptionResult(
      id = SubscriptionId("subId"),
      name = SubscriptionName("subName"),
      accountId = AccountId("accountId"),
      casActivationDate = None,
      customerAcceptanceDate = lastWeek,
      startDate = lastWeek,
      endDate = subEndDate,
      ratePlans = List(RatePlan("Weekend+", charges)),
    )

    val actualResponse = GetSubscriptionExpiry(today)("123-sold", digiPackSub, accountSummary)
    actualResponse shouldEqual expectedResponse
  }

  it should "recognise digital charges with name set to Digital Pack-bolt on" in {

    val twoWeeksFromNow = nextWeek.plusWeeks(1)
    val charges = List(
      RatePlanCharge("Digital Pack-bolt on", lastWeek, nextWeek),
      RatePlanCharge("Saturday", lastWeek, twoWeeksFromNow),
      RatePlanCharge("Sunday", lastWeek, twoWeeksFromNow),
    )

    val digiPackSub = SubscriptionResult(
      id = SubscriptionId("subId"),
      name = SubscriptionName("subName"),
      accountId = AccountId("accountId"),
      casActivationDate = None,
      customerAcceptanceDate = lastWeek,
      startDate = lastWeek,
      endDate = subEndDate,
      ratePlans = List(RatePlan("Weekend+", charges)),
    )

    val actualResponse = GetSubscriptionExpiry(today)("123-sold", digiPackSub, accountSummary)
    actualResponse shouldEqual expectedResponse
  }
  it should "return not found for invalid password" in {
    val actualResponse = GetSubscriptionExpiry(today)("invalid password", digitalPack, accountSummary)
    actualResponse shouldEqual notFoundResponse
  }

  it should "return not found for non digipack subscription" in {
    val actualResponse = GetSubscriptionExpiry(today)("billingLastName", monthlyContribution, accountSummary)
    actualResponse shouldEqual notFoundResponse
  }

  it should "[due to Coronavirus] recognise paper subscriptions as having digipack access for the time being" in {
    val actualHomeDeliveryResponse =
      GetSubscriptionExpiry(today)("billingLastName", newspaperHomeDelivery, accountSummary)
    actualHomeDeliveryResponse shouldEqual expectedResponse
    val actualVoucherResponse = GetSubscriptionExpiry(today)("billingLastName", newspaperVoucher, accountSummary)
    actualVoucherResponse shouldEqual expectedResponse
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
      ratePlans = List(RatePlan("Digital Pack", List(RatePlanCharge("Digital Pack Monthly", lastYear, lastWeek)))),
    )

    val actualResponse = GetSubscriptionExpiry(today)("123-sold", expiredDigitalPack, accountSummary)
    actualResponse shouldEqual notFoundResponse
  }

}

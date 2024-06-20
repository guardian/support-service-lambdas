package com.gu.holiday_stops

import com.gu.zuora.subscription.{Fixtures, RatePlan, RatePlanCharge, Subscription}

import java.time.LocalDate
import java.time.format.DateTimeFormatter

object TestFixtures {
  val startDate = LocalDate.of(2019, 1, 1)
  val endDate = startDate.plusMonths(3)
  val customerAcceptanceDate = startDate.plusMonths(1)

  val gwDomesticAccount = Fixtures.mkAccount()
  val gwDomesticSubscription = Subscription(
    subscriptionNumber = "Sub12344",
    termStartDate = startDate,
    termEndDate = endDate,
    customerAcceptanceDate = customerAcceptanceDate,
    contractEffectiveDate = customerAcceptanceDate,
    currentTerm = 12,
    currentTermPeriodType = "Month",
    autoRenew = true,
    ratePlans = List(
      RatePlan(
        productName = "Guardian Weekly - Domestic",
        ratePlanName = "GW Oct 18 - Quarterly - Domestic",
        ratePlanCharges = List(
          RatePlanCharge(
            name = "GW Oct 18 - Quarterly - Domestic",
            number = "C1",
            37.50,
            Some("Quarter"),
            effectiveStartDate = startDate,
            chargedThroughDate = Some(endDate),
            HolidayStart__c = None,
            HolidayEnd__c = None,
            processedThroughDate = Some(endDate.minusMonths(3)),
            "",
            specificBillingPeriod = None,
            endDateCondition = Some("Subscription_End"),
            upToPeriodsType = None,
            upToPeriods = None,
            billingDay = None,
            triggerEvent = Some("SpecificDate"),
            triggerDate = Some(startDate),
            discountPercentage = None,
            effectiveEndDate = LocalDate.now,
          ),
        ),
        productRatePlanId = "",
        id = "",
        lastChangeType = None,
      ),
    ),
    "Active",
    accountNumber = "123456",
  )

  val t3Subscription = Fixtures.subscriptionFromJson("TierThreeSubscription.json")
  val t3Account = Fixtures.accountFromJson("TierThreeAccount.json")
 
  def asIsoDateString(date: LocalDate) = date.format(DateTimeFormatter.ISO_LOCAL_DATE)
}

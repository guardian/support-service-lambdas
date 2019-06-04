package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.{HolidayStopRequest, HolidayStopRequestActionedCount, HolidayStopRequestEndDate, HolidayStopRequestId, HolidayStopRequestStartDate, ProductName, SubscriptionName}

object Fixtures {

  def mkSubscription(
    termEndDate: LocalDate,
    price: Double,
    billingPeriod: String,
    effectiveEndDate: LocalDate
  ) =
    Subscription(
      subscriptionNumber = "S1",
      termEndDate,
      currentTerm = 12,
      currentTermPeriodType = "Month",
      autoRenew = true,
      ratePlans = Seq(
        RatePlan(
          productName = "Guardian Weekly",
          ratePlanCharges =
            Seq(RatePlanCharge(price, Some(billingPeriod), LocalDate.of(2019, 1, 1), effectiveEndDate))
        )
      )
    )

  def mkHolidayStopRequest(id: String) = HolidayStopRequest(
    Id = HolidayStopRequestId(id),
    Start_Date__c = HolidayStopRequestStartDate(Time.toJodaDate(LocalDate.of(2019, 1, 1))),
    End_Date__c = HolidayStopRequestEndDate(Time.toJodaDate(LocalDate.of(2019, 2, 15))),
    Actioned_Count__c = HolidayStopRequestActionedCount(3),
    Subscription_Name__c = SubscriptionName("subName"),
    Product_Name__c = ProductName("Guardian Weekly")
  )

  val config = Config(
    zuoraCredentials = ZuoraAccess(baseUrl = "", username = "", password = ""),
    sfCredentials = SFAuthConfig("", "", "", "", "", ""),
    holidayCreditProductRatePlanId = "ratePlanId",
    holidayCreditProductRatePlanChargeId = "ratePlanChargeId"
  )
}

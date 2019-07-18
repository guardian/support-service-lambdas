package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{ZuoraRef, HolidayStopRequestsDetailChargeCode, HolidayStopRequestDetails, StoppedPublicationDate}
import com.gu.util.Time

object Fixtures {

  def mkRatePlanCharge(
    price: Double,
    billingPeriod: String,
    chargedThroughDate: Option[LocalDate] = Some(LocalDate.of(2019, 9, 2))
  ) = RatePlanCharge(
    name = "GW",
    number = "C1",
    price,
    Some(billingPeriod),
    effectiveStartDate = LocalDate.of(2018, 6, 10),
    chargedThroughDate,
    HolidayStart__c = None,
    HolidayEnd__c = None
  )

  def mkSubscription(
    termEndDate: LocalDate,
    price: Double,
    billingPeriod: String,
    chargedThroughDate: Option[LocalDate]
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
            Seq(mkRatePlanCharge(
              price,
              billingPeriod,
              chargedThroughDate
            ))
        )
      )
    )

  def mkSubscriptionWithHolidayStops() = Subscription(
    subscriptionNumber = "S1",
    termEndDate = LocalDate.of(2020, 3, 1),
    currentTerm = 12,
    currentTermPeriodType = "Month",
    autoRenew = true,
    ratePlans = Seq(
      RatePlan(
        productName = "Discounts",
        ratePlanCharges = Seq(RatePlanCharge(
          name = "Holiday Credit",
          number = "C2",
          price = -3.27,
          billingPeriod = None,
          effectiveStartDate = LocalDate.of(2019, 9, 7),
          chargedThroughDate = None,
          HolidayStart__c = Some(LocalDate.of(2019, 8, 9)),
          HolidayEnd__c = Some(LocalDate.of(2019, 8, 9))
        ))
      ),
      RatePlan(
        productName = "Not a discount",
        ratePlanCharges = Seq(RatePlanCharge(
          name = "Holiday Credit",
          number = "C29",
          price = -3.27,
          billingPeriod = None,
          effectiveStartDate = LocalDate.of(2019, 9, 7),
          chargedThroughDate = None,
          HolidayStart__c = Some(LocalDate.of(2019, 8, 11)),
          HolidayEnd__c = Some(LocalDate.of(2019, 8, 11))
        ))
      ),
      RatePlan(
        productName = "Discounts",
        ratePlanCharges = Seq(RatePlanCharge(
          name = "Some other discount",
          number = "C73",
          price = -5.81,
          billingPeriod = None,
          effectiveStartDate = LocalDate.of(2019, 9, 7),
          chargedThroughDate = None,
          HolidayStart__c = Some(LocalDate.of(2019, 8, 19)),
          HolidayEnd__c = Some(LocalDate.of(2019, 8, 19))
        ))
      ),
      RatePlan(
        productName = "Discounts",
        ratePlanCharges = Seq(RatePlanCharge(
          name = "Holiday Credit",
          number = "C3",
          price = -5.81,
          billingPeriod = None,
          effectiveStartDate = LocalDate.of(2019, 9, 7),
          chargedThroughDate = None,
          HolidayStart__c = Some(LocalDate.of(2019, 8, 2)),
          HolidayEnd__c = Some(LocalDate.of(2019, 8, 2))
        ))
      ),
      RatePlan(
        productName = "Discounts",
        ratePlanCharges = Seq(RatePlanCharge(
          name = "Holiday Credit",
          number = "C987",
          price = -4.92,
          billingPeriod = None,
          effectiveStartDate = LocalDate.of(2018, 11, 16),
          chargedThroughDate = None,
          HolidayStart__c = Some(LocalDate.of(2018, 11, 16)),
          HolidayEnd__c = Some(LocalDate.of(2019, 1, 4))
        ))
      ),
      RatePlan(
        productName = "Guardian Weekly",
        ratePlanCharges = Seq(mkRatePlanCharge(
          price = 42.7,
          billingPeriod = "Quarter",
          chargedThroughDate = Some(LocalDate.of(2019, 9, 7))
        ))
      )
    )
  )

  def mkHolidayStopRequest(
    id: String,
    stopDate: LocalDate = LocalDate.of(2019, 1, 1)
  ) = HolidayStopRequest(
    Id = HolidayStopRequestId(id),
    Start_Date__c = HolidayStopRequestStartDate(Time.toJodaDate(stopDate)),
    End_Date__c = HolidayStopRequestEndDate(Time.toJodaDate(stopDate)),
    Actioned_Count__c = HolidayStopRequestActionedCount(3),
    Subscription_Name__c = SubscriptionName("subName"),
    Product_Name__c = ProductName("Guardian Weekly")
  )

  def mkHolidayStopRequestDetails(request: HolidayStopRequest, chargeCode: String) = HolidayStopRequestDetails(
    request,
    zuoraRefs = Some(Seq(ZuoraRef(
      chargeCode = HolidayStopRequestsDetailChargeCode(chargeCode),
      stoppedPublicationDate = StoppedPublicationDate(Time.toJavaDate(request.Start_Date__c.value))
    )))
  )

  def mkHolidayStop(date: LocalDate) = HolidayStop(
    requestId = HolidayStopRequestId("R1"),
    subscriptionName = "S1",
    stoppedPublicationDate = date
  )

  val config = Config(
    zuoraConfig = ZuoraConfig(baseUrl = "", holidayStopProcessor = HolidayStopProcessor(Oauth(clientId = "", clientSecret = ""))),
    sfConfig = SFAuthConfig("", "", "", "", "", ""),
    holidayCreditProductRatePlanId = "ratePlanId",
    holidayCreditProductRatePlanChargeId = "ratePlanChargeId"
  )
}

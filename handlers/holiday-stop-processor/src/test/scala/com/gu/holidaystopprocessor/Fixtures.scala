package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holiday_stops.{Config, HolidayCreditProduct, HolidayStop, HolidayStopProcessor, Oauth, RatePlan, RatePlanCharge, Subscription, ZuoraConfig}
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._

object Fixtures {

  def billingPeriodToMonths(billingPeriod: String): Int = billingPeriod match {
    case "Quarter" => 3
    case "Annual" => 12
  }

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
    HolidayEnd__c = None,
    processedThroughDate = chargedThroughDate.map(_.minusMonths(billingPeriodToMonths(billingPeriod)))
  )

  def mkSubscription(
    termStartDate: LocalDate = LocalDate.now(),
    termEndDate: LocalDate = LocalDate.now(),
    price: Double = -1.0,
    billingPeriod: String = "Quarter",
    chargedThroughDate: Option[LocalDate] = None
  ) =
    Subscription(
      subscriptionNumber = "S1",
      termStartDate,
      termEndDate,
      currentTerm = 12,
      currentTermPeriodType = "Month",
      autoRenew = true,
      ratePlans = List(
        RatePlan(
          productName = "Guardian Weekly",
          ratePlanCharges =
            List(mkRatePlanCharge(
              price,
              billingPeriod,
              chargedThroughDate
            )),
          Fixtures.config.guardianWeeklyProductRatePlanIds.head,
          ""
        )
      )
    )

  def mkSubscriptionWithHolidayStops() = Subscription(
    subscriptionNumber = "S1",
    termStartDate = LocalDate.of(2019, 3, 1),
    termEndDate = LocalDate.of(2020, 3, 1),
    currentTerm = 12,
    currentTermPeriodType = "Month",
    autoRenew = true,
    ratePlans = List(
      RatePlan(
        productName = "Discounts",
        ratePlanCharges = List(RatePlanCharge(
          name = "Holiday Credit",
          number = "C2",
          price = -3.27,
          billingPeriod = None,
          effectiveStartDate = LocalDate.of(2019, 9, 7),
          chargedThroughDate = None,
          HolidayStart__c = Some(LocalDate.of(2019, 8, 9)),
          HolidayEnd__c = Some(LocalDate.of(2019, 8, 9)),
          processedThroughDate = None
        )),
        Fixtures.config.guardianWeeklyProductRatePlanIds.head,
        ""
      ),
      RatePlan(
        productName = "Discounts",
        ratePlanCharges = List(RatePlanCharge(
          name = "Holiday Credit",
          number = "C5",
          price = -3.27,
          billingPeriod = None,
          effectiveStartDate = LocalDate.of(2019, 9, 7),
          chargedThroughDate = None,
          HolidayStart__c = Some(LocalDate.of(2019, 9, 1)),
          HolidayEnd__c = Some(LocalDate.of(2019, 9, 1)),
          processedThroughDate = None
        )),
        Fixtures.config.guardianWeeklyProductRatePlanIds.head,
        ""
      ),
      RatePlan(
        productName = "Not a discount",
        ratePlanCharges = List(RatePlanCharge(
          name = "Holiday Credit",
          number = "C29",
          price = -3.27,
          billingPeriod = None,
          effectiveStartDate = LocalDate.of(2019, 9, 7),
          chargedThroughDate = None,
          HolidayStart__c = Some(LocalDate.of(2019, 8, 11)),
          HolidayEnd__c = Some(LocalDate.of(2019, 8, 11)),
          processedThroughDate = None
        )),
        Fixtures.config.guardianWeeklyProductRatePlanIds.head,
        ""
      ),
      RatePlan(
        productName = "Discounts",
        ratePlanCharges = List(RatePlanCharge(
          name = "Some other discount",
          number = "C73",
          price = -5.81,
          billingPeriod = None,
          effectiveStartDate = LocalDate.of(2019, 9, 7),
          chargedThroughDate = None,
          HolidayStart__c = Some(LocalDate.of(2019, 8, 19)),
          HolidayEnd__c = Some(LocalDate.of(2019, 8, 19)),
          processedThroughDate = None
        )),
        "",
        ""
      ),
      RatePlan(
        productName = "Discounts",
        ratePlanCharges = List(RatePlanCharge(
          name = "Holiday Credit",
          number = "C3",
          price = -5.81,
          billingPeriod = None,
          effectiveStartDate = LocalDate.of(2019, 9, 7),
          chargedThroughDate = None,
          HolidayStart__c = Some(LocalDate.of(2019, 8, 2)),
          HolidayEnd__c = Some(LocalDate.of(2019, 8, 2)),
          processedThroughDate = None
        )),
        Fixtures.config.guardianWeeklyProductRatePlanIds.head,
        ""
      ),
      RatePlan(
        productName = "Discounts",
        ratePlanCharges = List(RatePlanCharge(
          name = "Holiday Credit",
          number = "C987",
          price = -4.92,
          billingPeriod = None,
          effectiveStartDate = LocalDate.of(2018, 11, 16),
          chargedThroughDate = None,
          HolidayStart__c = Some(LocalDate.of(2018, 11, 16)),
          HolidayEnd__c = Some(LocalDate.of(2019, 1, 4)),
          processedThroughDate = None
        )),
        Fixtures.config.guardianWeeklyProductRatePlanIds.head,
        ""
      ),
      RatePlan(
        productName = "Guardian Weekly",
        ratePlanCharges = List(mkRatePlanCharge(
          price = 42.7,
          billingPeriod = "Quarter",
          chargedThroughDate = Some(LocalDate.of(2019, 9, 7))
        )),
        Fixtures.config.guardianWeeklyProductRatePlanIds.head,
        ""
      )
    )
  )

  def mkHolidayStopRequest(
    id: String,
    stopDate: LocalDate = LocalDate.of(2019, 1, 1),
    subscriptionName: SubscriptionName = SubscriptionName("S1")
  ) = HolidayStopRequest(
    Id = HolidayStopRequestId(id),
    Start_Date__c = HolidayStopRequestStartDate(stopDate),
    End_Date__c = HolidayStopRequestEndDate(stopDate),
    Actioned_Count__c = HolidayStopRequestActionedCount(3),
    Pending_Count__c = 4,
    Total_Issues_Publications_Impacted_Count__c = 7,
    Subscription_Name__c = subscriptionName,
    Product_Name__c = ProductName("Gu Weekly"),
    Holiday_Stop_Request_Detail__r = None
  )

  def mkHolidayStopRequestDetails(request: HolidayStopRequest, chargeCode: String) = HolidayStopRequestsDetail(
    Id = HolidayStopRequestsDetailId(request.Id.value),
    Subscription_Name__c = request.Subscription_Name__c,
    Product_Name__c = request.Product_Name__c,
    Stopped_Publication_Date__c = StoppedPublicationDate(request.Start_Date__c.value),
    Estimated_Price__c = None,
    Charge_Code__c = Some(HolidayStopRequestsDetailChargeCode(chargeCode)),
    Actual_Price__c = None
  )

  def mkHolidayStop(date: LocalDate) = HolidayStop(
    requestId = HolidayStopRequestsDetailId("R1"),
    subscriptionName = SubscriptionName("S1"),
    productName = ProductName("Gu Weekly"),
    stoppedPublicationDate = date,
    estimatedCharge = None
  )

  val config = Config(
    zuoraConfig = ZuoraConfig(baseUrl = "", holidayStopProcessor = HolidayStopProcessor(Oauth(clientId = "", clientSecret = ""))),
    sfConfig = SFAuthConfig("", "", "", "", "", ""),
    HolidayCreditProduct(
      productRatePlanId = "ratePlanId",
      productRatePlanChargeId = "ratePlanChargeId"
    ),
    Config.guardianWeeklyProductRatePlanIdsPROD // FIXME
  )
}

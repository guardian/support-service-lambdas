package com.gu.holiday_stops

import java.time.LocalDate

import com.gu.holiday_stops.subscription.{RatePlan, RatePlanCharge, Subscription}
import com.gu.salesforce.RecordsWrapperCaseClass
import com.gu.salesforce.SFAuthConfig
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.{HolidayStopRequest, HolidayStopRequestActionedCount, HolidayStopRequestEndDate, HolidayStopRequestIsWithdrawn, HolidayStopRequestStartDate}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._
import io.circe.generic.auto._
import io.circe.parser.decode
import org.scalatest.Assertions

import scala.io.Source

object Fixtures extends Assertions {

  def billingPeriodToMonths(billingPeriod: String): Int = billingPeriod match {
    case "Month" => 1
    case "Quarter" => 3
    case "Annual" => 12
    case "Semi_Annual" => 6
    case "Specific_Weeks" => 1
  }

  def mkRatePlanCharge(
    name: String,
    price: Double,
    billingPeriod: String,
    chargedThroughDate: Option[LocalDate] = Some(LocalDate.of(2019, 9, 2)),
    effectiveStartDate: LocalDate = LocalDate.of(2019, 6, 2),
    specificBillingPeriod: Option[Int] = None,
    upToPeriodsType: Option[String] = None,
    upToPeriods: Option[Int] = None,
    endDateCondition: Option[String] = Some("Subscription_End"),
  ) = RatePlanCharge(
    name = name,
    number = "C1",
    price,
    Some(billingPeriod),
    effectiveStartDate,
    chargedThroughDate,
    HolidayStart__c = None,
    HolidayEnd__c = None,
    processedThroughDate = chargedThroughDate.map(_.minusMonths(billingPeriodToMonths(billingPeriod))),
    productRatePlanChargeId = "",
    specificBillingPeriod = specificBillingPeriod,
    endDateCondition = endDateCondition,
    upToPeriodsType = upToPeriodsType,
    upToPeriods = upToPeriods
  )

  def mkGuardianWeeklySubscription(
    termStartDate: LocalDate = LocalDate.now(),
    termEndDate: LocalDate = LocalDate.now(),
    customerAcceptanceDate: LocalDate = LocalDate.now(),
    price: Double = -1.0,
    billingPeriod: String = "Quarter",
    chargedThroughDate: Option[LocalDate] = None,
    effectiveStartDate: LocalDate = LocalDate.now()
  ): Subscription =
    Subscription(
      subscriptionNumber = "S1",
      termStartDate,
      termEndDate,
      customerAcceptanceDate,
      currentTerm = 12,
      currentTermPeriodType = "Month",
      autoRenew = true,
      ratePlans = List(
        RatePlan(
          productName = "Guardian Weekly - Domestic",
          ratePlanName = "GW Oct 18 - Quarterly - Domestic",
          ratePlanCharges =
            List(mkRatePlanCharge(
              "GW Oct 18 - Quarterly - Domestic",
              price,
              billingPeriod,
              chargedThroughDate,
              effectiveStartDate
            )),
          productRatePlanId = "",
          id = "",
          lastChangeType = None
        )
      ),
      status = "Active"
    )

  def mkSubscriptionWithHolidayStops() = Subscription(
    status = "Active",
    subscriptionNumber = "S1",
    termStartDate = LocalDate.of(2019, 3, 1),
    termEndDate = LocalDate.of(2020, 3, 1),
    customerAcceptanceDate = LocalDate.of(2020, 4, 1),
    currentTerm = 12,
    currentTermPeriodType = "Month",
    autoRenew = true,
    ratePlans = List(
      RatePlan(
        productName = "Discounts",
        ratePlanName = "DO NOT USE MANUALLY: Holiday Credit - automated",
        ratePlanCharges = List(RatePlanCharge(
          name = "Holiday Credit",
          number = "C2",
          price = -3.27,
          billingPeriod = None,
          effectiveStartDate = LocalDate.of(2019, 9, 7),
          chargedThroughDate = None,
          HolidayStart__c = Some(LocalDate.of(2019, 8, 9)),
          HolidayEnd__c = Some(LocalDate.of(2019, 8, 9)),
          processedThroughDate = None,
          productRatePlanChargeId = "",
          specificBillingPeriod = None,
          endDateCondition = None,
          upToPeriodsType = None,
          upToPeriods = None
        )),
        productRatePlanId = "",
        id = "",
        lastChangeType = None
      ),
      RatePlan(
        productName = "Discounts",
        ratePlanName = "DO NOT USE MANUALLY: Holiday Credit - automated",
        ratePlanCharges = List(RatePlanCharge(
          name = "Holiday Credit",
          number = "C5",
          price = -3.27,
          billingPeriod = None,
          effectiveStartDate = LocalDate.of(2019, 9, 7),
          chargedThroughDate = None,
          HolidayStart__c = Some(LocalDate.of(2019, 9, 6)),
          HolidayEnd__c = Some(LocalDate.of(2019, 9, 6)),
          processedThroughDate = None,
          productRatePlanChargeId = "",
          specificBillingPeriod = None,
          endDateCondition = None,
          upToPeriodsType = None,
          upToPeriods = None
        )),
        productRatePlanId = "",
        id = "",
        lastChangeType = None
      ),
      RatePlan(
        productName = "Not a discount",
        ratePlanName = "???",
        ratePlanCharges = List(RatePlanCharge(
          name = "Holiday Credit",
          number = "C29",
          price = -3.27,
          billingPeriod = None,
          effectiveStartDate = LocalDate.of(2019, 9, 7),
          chargedThroughDate = None,
          HolidayStart__c = Some(LocalDate.of(2019, 8, 11)),
          HolidayEnd__c = Some(LocalDate.of(2019, 8, 11)),
          processedThroughDate = None,
          productRatePlanChargeId = "",
          specificBillingPeriod = None,
          endDateCondition = None,
          upToPeriodsType = None,
          upToPeriods = None
        )),
        productRatePlanId = "",
        id = "",
        lastChangeType = None
      ),
      RatePlan(
        productName = "Discounts",
        ratePlanName = "DO NOT USE MANUALLY: Holiday Credit - automated",
        ratePlanCharges = List(RatePlanCharge(
          name = "Some other discount",
          number = "C73",
          price = -5.81,
          billingPeriod = None,
          effectiveStartDate = LocalDate.of(2019, 9, 7),
          chargedThroughDate = None,
          HolidayStart__c = Some(LocalDate.of(2019, 8, 19)),
          HolidayEnd__c = Some(LocalDate.of(2019, 8, 19)),
          processedThroughDate = None,
          productRatePlanChargeId = "",
          specificBillingPeriod = None,
          endDateCondition = None,
          upToPeriodsType = None,
          upToPeriods = None
        )),
        productRatePlanId = "",
        id = "",
        lastChangeType = None
      ),
      RatePlan(
        productName = "Discounts",
        ratePlanName = "DO NOT USE MANUALLY: Holiday Credit - automated",
        ratePlanCharges = List(RatePlanCharge(
          name = "Holiday Credit",
          number = "C3",
          price = -5.81,
          billingPeriod = None,
          effectiveStartDate = LocalDate.of(2019, 9, 7),
          chargedThroughDate = None,
          HolidayStart__c = Some(LocalDate.of(2019, 8, 2)),
          HolidayEnd__c = Some(LocalDate.of(2019, 8, 2)),
          processedThroughDate = None,
          productRatePlanChargeId = "",
          specificBillingPeriod = None,
          endDateCondition = None,
          upToPeriodsType = None,
          upToPeriods = None
        )),
        productRatePlanId = "",
        id = "",
        lastChangeType = None
      ),
      RatePlan(
        productName = "Discounts",
        ratePlanName = "DO NOT USE MANUALLY: Holiday Credit - automated",
        ratePlanCharges = List(RatePlanCharge(
          name = "Holiday Credit",
          number = "C987",
          price = -4.92,
          billingPeriod = None,
          effectiveStartDate = LocalDate.of(2018, 11, 16),
          chargedThroughDate = None,
          HolidayStart__c = Some(LocalDate.of(2018, 11, 16)),
          HolidayEnd__c = Some(LocalDate.of(2019, 1, 4)),
          processedThroughDate = None,
          productRatePlanChargeId = "",
          specificBillingPeriod = None,
          endDateCondition = None,
          upToPeriodsType = None,
          upToPeriods = None
        )),
        productRatePlanId = "",
        id = "",
        lastChangeType = None
      ),
      RatePlan(
        productName = "Guardian Weekly - Domestic",
        ratePlanName = "GW Oct 18 - Quarterly - Domestic",
        ratePlanCharges = List(mkRatePlanCharge(
          name = "GW Oct 18 - Quarterly - Domestic",
          price = 42.7,
          billingPeriod = "Quarter",
          chargedThroughDate = Some(LocalDate.of(2019, 9, 7))
        )),
        productRatePlanId = "",
        id = "",
        lastChangeType = None
      )
    )
  )

  def subscriptionFromJson(resource: String): Subscription = {
    val subscriptionRaw = Source.fromResource(resource).mkString
    decode[Subscription](subscriptionRaw).getOrElse(fail(s"Could not decode $subscriptionRaw"))
  }

  def mkHolidayStopRequest(
    id: String,
    stopDate: LocalDate = LocalDate.of(2019, 1, 1),
    subscriptionName: SubscriptionName = SubscriptionName("S1"),
    requestDetail: List[HolidayStopRequestsDetail] = Nil
  ) = HolidayStopRequest(
    Id = HolidayStopRequestId(id),
    Start_Date__c = HolidayStopRequestStartDate(stopDate),
    End_Date__c = HolidayStopRequestEndDate(stopDate),
    Actioned_Count__c = HolidayStopRequestActionedCount(3),
    Pending_Count__c = 4,
    Total_Issues_Publications_Impacted_Count__c = 7,
    Subscription_Name__c = subscriptionName,
    Product_Name__c = ProductName("Gu Weekly"),
    Holiday_Stop_Request_Detail__r = Some(RecordsWrapperCaseClass(requestDetail)),
    Withdrawn_Time__c = None,
    Is_Withdrawn__c = HolidayStopRequestIsWithdrawn(false)
  )

  def mkHolidayStopRequestDetailsFromHolidayStopRequest(request: HolidayStopRequest, chargeCode: String) = HolidayStopRequestsDetail(
    Id = HolidayStopRequestsDetailId(request.Id.value),
    Subscription_Name__c = request.Subscription_Name__c,
    Product_Name__c = request.Product_Name__c,
    Stopped_Publication_Date__c = StoppedPublicationDate(request.Start_Date__c.value),
    Estimated_Price__c = None,
    Charge_Code__c = Some(HolidayStopRequestsDetailChargeCode(chargeCode)),
    Actual_Price__c = None,
    Expected_Invoice_Date__c = None
  )

  def mkHolidayStopRequestDetails(
    id: String = "HSD-1",
    subscriptionName: String = "Subscription 1",
    productName: String = "Product 1",
    stopDate: LocalDate = LocalDate.of(2019, 1, 1),
    chargeCode: Option[String] = Some("Charge code 1"),
    estimatedPrice: Option[Double] = None,
    actualPrice: Option[Double] = None,
    expectedInvoiceDate: Option[LocalDate] = None
  ) = {
    HolidayStopRequestsDetail(
      Id = HolidayStopRequestsDetailId(id),
      Subscription_Name__c = SubscriptionName(subscriptionName),
      Product_Name__c = ProductName(productName),
      Stopped_Publication_Date__c = StoppedPublicationDate(stopDate),
      Estimated_Price__c = estimatedPrice.map(HolidayStopRequestsDetailChargePrice.apply),
      Charge_Code__c = chargeCode.map(HolidayStopRequestsDetailChargeCode.apply),
      Actual_Price__c = actualPrice.map(HolidayStopRequestsDetailChargePrice.apply),
      Expected_Invoice_Date__c = expectedInvoiceDate.map(HolidayStopRequestsDetailExpectedInvoiceDate.apply)
    )
  }

  def mkHolidayStopRequestsDetail(date: LocalDate) = HolidayStopRequestsDetail(
    Id = HolidayStopRequestsDetailId("R1"),
    Subscription_Name__c = SubscriptionName("S1"),
    Product_Name__c = ProductName("Gu Weekly"),
    Stopped_Publication_Date__c = StoppedPublicationDate(date),
    Estimated_Price__c = None,
    Charge_Code__c = None,
    Actual_Price__c = None,
    Expected_Invoice_Date__c = None
  )

  val config = Config(
    zuoraConfig = ZuoraConfig(baseUrl = "", holidayStopProcessor = HolidayStopProcessor(Oauth(clientId = "", clientSecret = ""))),
    sfConfig = SFAuthConfig("", "", "", "", "", ""),
    HolidayCreditProduct.Dev
  )
}

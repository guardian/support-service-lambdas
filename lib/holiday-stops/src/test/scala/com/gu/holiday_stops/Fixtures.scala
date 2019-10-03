package com.gu.holiday_stops

import java.time.LocalDate

import com.gu.holiday_stops.subscription.{RatePlan, RatePlanCharge, Subscription}
import com.gu.salesforce.RecordsWrapperCaseClass
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.{HolidayStopRequest, HolidayStopRequestActionedCount, HolidayStopRequestEndDate, HolidayStopRequestStartDate}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail._
import io.circe.generic.auto._
import io.circe.parser.decode
import org.scalatest.Assertions

import scala.io.Source

object Fixtures extends Assertions {

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
    processedThroughDate = chargedThroughDate.map(_.minusMonths(billingPeriodToMonths(billingPeriod))),
    productRatePlanChargeId = ""
  )

  def mkSubscription(
    termStartDate: LocalDate = LocalDate.now(),
    termEndDate: LocalDate = LocalDate.now(),
    price: Double = -1.0,
    billingPeriod: String = "Quarter",
    chargedThroughDate: Option[LocalDate] = None
  ): Subscription =
    Subscription(
      subscriptionNumber = "S1",
      termStartDate,
      termEndDate,
      currentTerm = 12,
      currentTermPeriodType = "Month",
      autoRenew = true,
      ratePlans = List(
        RatePlan(
          productName = "Guardian Weekly - Domestic",
          ratePlanCharges =
            List(mkRatePlanCharge(
              price,
              billingPeriod,
              chargedThroughDate
            )),
          "",
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
          processedThroughDate = None,
          productRatePlanChargeId = ""
        )),
        "",
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
          processedThroughDate = None,
          productRatePlanChargeId = ""
        )),
        "",
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
          processedThroughDate = None,
          productRatePlanChargeId = ""
        )),
        "",
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
          processedThroughDate = None,
          productRatePlanChargeId = ""
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
          processedThroughDate = None,
          productRatePlanChargeId = ""
        )),
        "",
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
          processedThroughDate = None,
          productRatePlanChargeId = ""
        )),
        "",
        ""
      ),
      RatePlan(
        productName = "Guardian Weekly - Domestic",
        ratePlanCharges = List(mkRatePlanCharge(
          price = 42.7,
          billingPeriod = "Quarter",
          chargedThroughDate = Some(LocalDate.of(2019, 9, 7))
        )),
        "",
        ""
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
    Holiday_Stop_Request_Detail__r = Some(RecordsWrapperCaseClass(requestDetail))
  )

  def mkHolidayStopRequestDetailsFromHolidayStopRequest(request: HolidayStopRequest, chargeCode: String) = HolidayStopRequestsDetail(
    Id = HolidayStopRequestsDetailId(request.Id.value),
    Subscription_Name__c = request.Subscription_Name__c,
    Product_Name__c = request.Product_Name__c,
    Stopped_Publication_Date__c = StoppedPublicationDate(request.Start_Date__c.value),
    Estimated_Price__c = None,
    Charge_Code__c = Some(HolidayStopRequestsDetailChargeCode(chargeCode)),
    Actual_Price__c = None
  )

  def mkHolidayStopRequestDetails(
    id: String = "HSD-1",
    subscriptionName: String = "Subscription 1",
    productName: String = "Product 1",
    stopDate: LocalDate = LocalDate.of(2019, 1, 1),
    chargeCode: String = "Charge code 1",
    estimatedPrice:  Option[Double] = None,
    actualPrice:  Option[Double] = None,
  ) = {
    HolidayStopRequestsDetail(
      Id = HolidayStopRequestsDetailId(id),
      Subscription_Name__c = SubscriptionName(subscriptionName),
      Product_Name__c = ProductName(productName),
      Stopped_Publication_Date__c = StoppedPublicationDate(stopDate),
      Estimated_Price__c = estimatedPrice.map(HolidayStopRequestsDetailChargePrice.apply),
      Charge_Code__c = Some(HolidayStopRequestsDetailChargeCode(chargeCode)),
      Actual_Price__c = actualPrice.map(HolidayStopRequestsDetailChargePrice.apply)
    )
  }

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
    HolidayCreditProduct.Dev
  )
}

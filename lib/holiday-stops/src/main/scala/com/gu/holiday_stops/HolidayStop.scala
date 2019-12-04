package com.gu.holiday_stops

import java.time.LocalDate

import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{HolidayStopRequestsDetail, HolidayStopRequestsDetailChargePrice, HolidayStopRequestsDetailId, ProductName, SubscriptionName}

case class HolidayStop(
  requestId: HolidayStopRequestsDetailId,
  subscriptionName: SubscriptionName,
  productName: ProductName,
  stoppedPublicationDate: LocalDate,
  estimatedCharge: Option[HolidayStopRequestsDetailChargePrice]
)

object HolidayStop {

  def apply(request: HolidayStopRequestsDetail): HolidayStop =
    HolidayStop(
      requestId = request.Id,
      subscriptionName = request.Subscription_Name__c,
      productName = request.Product_Name__c,
      stoppedPublicationDate = request.Stopped_Publication_Date__c.value,
      estimatedCharge = request.Estimated_Price__c
    )
}

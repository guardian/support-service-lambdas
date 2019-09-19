package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holiday_stops.ActionCalculator.SundayVoucherIssueSuspensionConstants
import com.gu.holiday_stops._
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{HolidayStopRequestsDetail, ProductName, ProductRatePlanName, SubscriptionName}

object SundayVoucherHolidayStopProcessor {

  def processHolidayStops(
    config: SundayVoucherHolidayStopConfig,
    getHolidayStopRequestsFromSalesforce: (ProductName, ProductRatePlanName, LocalDate) => Either[OverallFailure, List[HolidayStopRequestsDetail]],
    getSubscription: SubscriptionName => Either[ZuoraHolidayWriteError, Subscription],
    updateSubscription: (Subscription, HolidayCreditUpdate) => Either[ZuoraHolidayWriteError, Unit],
    writeHolidayStopsToSalesforce: List[HolidayStopResponse] => Either[SalesforceHolidayWriteError, Unit],
    processDateOverride: Option[LocalDate]
  ): ProcessResult = {
    //  case ProductRatePlanKey(ProductType("Newspaper - Voucher Book"), ProductRatePlanName("Sunday")) =>
    val processOverrideDate = LocalDate.of(2019, 9, 22)
    getHolidayStopRequestsFromSalesforce(ProductName("Newspaper Voucher"), ProductRatePlanName("Sunday"), calculateProcessDate(Some(processOverrideDate))) match {
      case Left(overallFailure) =>
        ProcessResult(overallFailure)

      case Right(holidayStopRequestsFromSalesforce) =>
        val holidayStops = holidayStopRequestsFromSalesforce.distinct.map(HolidayStop(_))
        val alreadyActionedHolidayStops = holidayStopRequestsFromSalesforce.flatMap(_.Charge_Code__c).distinct
        // val allZuoraHolidayStopResponses = holidayStops.map(writeHolidayStopToZuora( ))
        println(holidayStops)
        ProcessResult(Nil, Nil, Nil, None)
    }
  }
  private def calculateProcessDate(processDateOverride: Option[LocalDate]) = {
    processDateOverride.getOrElse(LocalDate.now.plusDays(SundayVoucherIssueSuspensionConstants.processorRunLeadTimeDays))
  }

  private def writeHolidayStopToZuora() = ??? // TODO
}

//package com.gu.holidaystopprocessor
//
//import java.time.LocalDate
//
//import cats.implicits._
//import com.gu.holiday_stops.ActionCalculator.GuardianWeeklyIssueSuspensionConstants
//import com.gu.holiday_stops._
//import com.gu.holiday_stops.subscription._
//import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.{HolidayStopRequestsDetail, HolidayStopRequestsDetailChargeCode, HolidayStopRequestsDetailChargePrice, ProductName, StoppedPublicationDate, SubscriptionName}
//
//object GuardianWeeklyHolidayStopProcess {
//  def processHolidayStops(
//    config: Config,
//    getHolidayStopRequestsFromSalesforce: Either[OverallFailure, List[HolidayStopRequestsDetail]],
//    getSubscription: SubscriptionName => Either[ZuoraHolidayWriteError, Subscription],
//    updateSubscription: (Subscription, HolidayCreditUpdate) => Either[ZuoraHolidayWriteError, Unit],
//    writeHolidayStopsToSalesforce: List[HolidayStopResponse] => Either[SalesforceHolidayWriteError, Unit],
//  ): ProcessResult = {
//    getHolidayStopRequestsFromSalesforce match {
//      case Left(overallFailure) =>
//        ProcessResult(overallFailure)
//
//      case Right(holidayStopRequestsFromSalesforce) =>
//        val holidayStops = holidayStopRequestsFromSalesforce.distinct.map(HolidayStop(_))
//        val alreadyActionedHolidayStops = holidayStopRequestsFromSalesforce.flatMap(_.Charge_Code__c).distinct
//        val allZuoraHolidayStopResponses = holidayStops.map(writeHolidayStopToZuora(config, getSubscription, updateSubscription))
//        val (failedZuoraResponses, successfulZuoraResponses) = allZuoraHolidayStopResponses.separate
//        val notAlreadyActionedHolidays = successfulZuoraResponses.filterNot(v => alreadyActionedHolidayStops.contains(v.chargeCode))
//        val salesforceExportResult = writeHolidayStopsToSalesforce(notAlreadyActionedHolidays)
//        ProcessResult(
//          holidayStops,
//          allZuoraHolidayStopResponses,
//          notAlreadyActionedHolidays,
//          OverallFailure(failedZuoraResponses, salesforceExportResult)
//        )
//    }
//  }
//
//  /**
//   * This is the main business logic for writing holiday stop to Zuora
//   */
//
//}

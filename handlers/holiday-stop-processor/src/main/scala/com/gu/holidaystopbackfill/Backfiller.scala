package com.gu.holidaystopbackfill

import java.io.File
import java.time.LocalDate

import com.gu.holidaystopbackfill.SalesforceHolidayStop._
import com.gu.holidaystopbackfill.ZuoraHolidayStop.holidayStopsAlreadyInZuora

object Backfiller {

  /*
   * This makes two passes to update Salesforce to ensure it's failsafe.
   * If any call fails it should leave Salesforce in a consistent state.
   * First, the holiday request table is updated, and then the zuora refs child table.
   */
  def backfill(src: File, startThreshold: LocalDate, endThreshold: Option[LocalDate], dryRun: Boolean): Either[BackfillFailure, BackfillResult] = {
    for {
      config <- Config()
      stopsInZuora <- Right(holidayStopsAlreadyInZuora(src))
      requestsInSf <- holidayStopRequestsAlreadyInSalesforce(config)(startThreshold, endThreshold)
      requestsToAddToSf = holidayStopRequestsToBeBackfilled(stopsInZuora, requestsInSf)
      _ <- holidayStopRequestsAddedToSalesforce(config, dryRun)(requestsToAddToSf)
      detailsInSf <- detailsAlreadyInSalesforce(config)(startThreshold, endThreshold)
      detailsToAddToSf = detailsToBeBackfilled(stopsInZuora, detailsInSf)
      _ <- detailsAddedToSalesforce(config, dryRun)(detailsToAddToSf)
    } yield BackfillResult(requestsToAddToSf, detailsToAddToSf)
  }
}

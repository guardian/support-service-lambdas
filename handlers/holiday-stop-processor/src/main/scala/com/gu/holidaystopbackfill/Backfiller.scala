package com.gu.holidaystopbackfill

import java.io.File

import com.gu.holidaystopbackfill.SalesforceHolidayStop._
import com.gu.holidaystopbackfill.ZuoraHolidayStop.holidayStopsAlreadyInZuora

object Backfiller {

  /*
   * This makes two passes to update Salesforce to ensure it's failsafe.
   * If any call fails it should leave Salesforce in a consistent state.
   * First, the holiday request table is updated, and then the zuora refs child table.
   */
  def backfill(src: File, dryRun: Boolean, stage: String): Either[BackfillFailure, BackfillResult] = {
    for {
      config <- Config(stage)
      stopsInZuora <- Right(holidayStopsAlreadyInZuora(src))
      minStartDate = stopsInZuora.map(_.startDate).minBy(_.value.toEpochDay)
      maxEndDate = stopsInZuora.map(_.endDate).maxBy(_.value.toEpochDay)
      requestsInSfBeforeWritingRequests <- holidayStopRequestsAlreadyInSalesforce(config)(minStartDate, maxEndDate)
      requestsToAddToSf = holidayStopRequestsToBeBackfilled(stopsInZuora, requestsInSfBeforeWritingRequests)
      _ <- holidayStopRequestsAddedToSalesforce(config, dryRun)(requestsToAddToSf)
      requestsInSfBeforeWritingDetails <- holidayStopRequestsAlreadyInSalesforce(config)(minStartDate, maxEndDate)
      detailsToAddToSf = detailsToBeBackfilled(stopsInZuora, requestsInSfBeforeWritingDetails)
      _ <- detailsAddedToSalesforce(config, dryRun)(detailsToAddToSf)
    } yield BackfillResult(requestsToAddToSf, detailsToAddToSf)
  }
}

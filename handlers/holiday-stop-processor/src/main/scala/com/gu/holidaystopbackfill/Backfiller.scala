package com.gu.holidaystopbackfill

import java.time.LocalDate

import com.gu.holidaystopbackfill.AccessToken.fromZuoraResponse
import com.gu.holidaystopbackfill.SalesforceHolidayStop.holidayStopsAlreadyInSalesforce
import com.gu.holidaystopbackfill.ZuoraHolidayStop.holidayStopsAlreadyInZuora

object Backfiller {

  /*
   * This makes two passes to update Salesforce to ensure it's failsafe.
   * If any call fails it should leave Salesforce in a consistent state.
   * First, the holiday request table is updated, and then the zuora refs child table.
   */
  def backfill(startThreshold: LocalDate, endThreshold: Option[LocalDate], dryRun: Boolean): Either[BackfillFailure, Unit] = {
    for {
      config <- Config.build()
      accessToken <- fromZuoraResponse(Zuora.accessTokenGetResponse(config.zuoraConfig))
      stopsInZuora1 <- holidayStopsAlreadyInZuora(Zuora.queryGetResponse(config.zuoraConfig, accessToken))(startThreshold, endThreshold)
      stopsInSf1 <- holidayStopsAlreadyInSalesforce(config.sfConfig)(startThreshold, endThreshold)
      requestsToAddToSf = SalesforceHolidayStop.holidayStopRequestsToBeBackfilled(stopsInZuora1, stopsInSf1)
      _ <- SalesforceHolidayStop.holidayStopRequestsAddedToSalesforce(config.sfConfig, dryRun)(requestsToAddToSf)
      stopsInZuora2 <- holidayStopsAlreadyInZuora(Zuora.queryGetResponse(config.zuoraConfig, accessToken))(startThreshold, endThreshold)
      stopsInSf2 <- holidayStopsAlreadyInSalesforce(config.sfConfig)(startThreshold, endThreshold)
      zuoraRefsToAddToSf = SalesforceHolidayStop.zuoraRefsToBeBackfilled(stopsInZuora2, stopsInSf2)
      zuoraRefsAddedToSf <- SalesforceHolidayStop.zuoraRefsAddedToSalesforce(config.sfConfig, dryRun)(zuoraRefsToAddToSf)
    } yield zuoraRefsAddedToSf
  }
}

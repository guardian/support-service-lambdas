package com.gu.holidaystopbackfill

import java.time.LocalDate

import com.gu.holidaystopbackfill.AccessToken.fromZuoraResponse
import com.gu.holidaystopbackfill.SalesforceHolidayStop.{holidayStopRequestsAddedToSalesforce, holidayStopRequestsAlreadyInSalesforce, holidayStopRequestsToBeBackfilled, zuoraRefsAlreadyInSalesforce, zuoraRefsAddedToSalesforce, zuoraRefsToBeBackfilled}
import com.gu.holidaystopbackfill.ZuoraHolidayStop.holidayStopsAlreadyInZuora

object Backfiller {

  /*
   * This makes two passes to update Salesforce to ensure it's failsafe.
   * If any call fails it should leave Salesforce in a consistent state.
   * First, the holiday request table is updated, and then the zuora refs child table.
   */
  def backfill(startThreshold: LocalDate, endThreshold: Option[LocalDate], dryRun: Boolean): Either[BackfillFailure, BackfillResult] = {
    for {
      config <- Config()
      accessToken <- fromZuoraResponse(Zuora.accessTokenGetResponse(config.zuoraConfig))
      stopsInZuora <- holidayStopsAlreadyInZuora(Zuora.queryGetResponse(config.zuoraConfig, accessToken))(startThreshold, endThreshold)
      requestsInSf <- holidayStopRequestsAlreadyInSalesforce(config.sfConfig)(startThreshold, endThreshold)
      requestsToAddToSf = holidayStopRequestsToBeBackfilled(stopsInZuora, requestsInSf)
      _ <- holidayStopRequestsAddedToSalesforce(config.sfConfig, dryRun)(requestsToAddToSf)
      zuoraRefsInSf <- zuoraRefsAlreadyInSalesforce(config.sfConfig)(startThreshold, endThreshold)
      zuoraRefsToAddToSf = zuoraRefsToBeBackfilled(stopsInZuora, zuoraRefsInSf)
      _ <- zuoraRefsAddedToSalesforce(config.sfConfig, dryRun)(zuoraRefsToAddToSf)
    } yield BackfillResult(requestsToAddToSf, zuoraRefsToAddToSf)
  }
}

package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holiday_stops._
import com.softwaremill.sttp.{Id, SttpBackend}

object HolidayStopProcess {

  def apply(config: Config, processDateOverride: Option[LocalDate], backend: SttpBackend[Id, Nothing]): List[ProcessResult] =
    Zuora.accessTokenGetResponse(config.zuoraConfig, backend) match {
      case Left(overallFailure) =>
        List(ProcessResult(overallFailure))

      case Right(zuoraAccessToken) =>
        List(
          GuardianWeeklyHolidayStopProcess.processHolidayStops(
            config = config.guardianWeeklyConfig,
            getHolidayStopRequestsFromSalesforce = Salesforce.holidayStopRequests(config.sfConfig),
            getSubscription = Zuora.subscriptionGetResponse(config, zuoraAccessToken, backend),
            updateSubscription = Zuora.subscriptionUpdateResponse(config, zuoraAccessToken, backend),
            writeHolidayStopsToSalesforce = Salesforce.holidayStopUpdateResponse(config.sfConfig),
            processDateOverride
          ),
          SundayVoucherHolidayStopProcessor.processHolidayStops(
            config = config.sundayVoucherConfig,
            getHolidayStopRequestsFromSalesforce = Salesforce.holidayStopRequests(config.sfConfig),
            getSubscription = Zuora.subscriptionGetResponse(config, zuoraAccessToken, backend),
            updateSubscription = Zuora.subscriptionUpdateResponse(config, zuoraAccessToken, backend),
            writeHolidayStopsToSalesforce = Salesforce.holidayStopUpdateResponse(config.sfConfig),
            processDateOverride
          )
        )
    }
}

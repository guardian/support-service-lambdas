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
          GuardianWeeklyHolidayStopProcess.processHolidayStops(config, Salesforce.holidayStopRequests(config.sfConfig), _, _, _, _),
          SundayVoucherHolidayStopProcessor.processHolidayStops(config, Salesforce.sundayVoucherHolidayStopRequests(config.sfConfig), _, _, _, _)
        ) map {
            _.apply(
              Zuora.subscriptionGetResponse(config, zuoraAccessToken, backend),
              Zuora.subscriptionUpdateResponse(config, zuoraAccessToken, backend),
              Salesforce.holidayStopUpdateResponse(config.sfConfig),
              processDateOverride
            )
          }
    }
}

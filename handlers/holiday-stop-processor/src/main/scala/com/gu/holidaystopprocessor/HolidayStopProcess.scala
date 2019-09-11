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
        config.supportedProductConfig.map {
          case gwConfig: GuardianWeeklyHolidayStopConfig =>
            GuardianWeeklyHolidayStopProcess.processHolidayStops(
              gwConfig.holidayCreditProduct,
              guardianWeeklyProductRatePlanIds = gwConfig.guardianWeeklyProductRatePlanIds,
              gwNforNProductRatePlanIds = gwConfig.gwNforNProductRatePlanIds,
              getHolidayStopRequestsFromSalesforce = Salesforce.holidayStopRequests(config.sfConfig, processDateOverride),
              getSubscription = Zuora.subscriptionGetResponse(config, zuoraAccessToken, backend),
              updateSubscription = Zuora.subscriptionUpdateResponse(config, zuoraAccessToken, backend),
              writeHolidayStopsToSalesforce = Salesforce.holidayStopUpdateResponse(config.sfConfig)
            )
        }
    }
}

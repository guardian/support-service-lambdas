package com.gu.holidaystopprocessor

import com.gu.holiday_stops.{OverallFailure, ZuoraHolidayError}
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequestsDetail.HolidayStopRequestsDetail
import com.typesafe.scalalogging.LazyLogging

case class ProcessResult(
  holidayStopsToApply: List[HolidayStopRequestsDetail],
  holidayStopResults: List[Either[ZuoraHolidayError, ZuoraHolidayWriteResult]],
  resultsToExport: List[ZuoraHolidayWriteResult],
  overallFailure: Option[OverallFailure]
)

object ProcessResult extends LazyLogging {
  def log(processResult: ProcessResult): Unit = {
    import processResult._
    logger.info(s"${holidayStopsToApply.size} holiday stops to apply:")
    resultsToExport.foreach(warnOnCreditDifference)
    holidayStopsToApply.foreach(stop => logger.info(stop.toString))
    holidayStopResults foreach {
      case Left(failure) => logger.error(failure.reason)
      case Right(response) => logger.info(response.toString)
    }
  }

  // FIXME: Temporary logging to confirm the problem of incorrect credits is fixed. Change to hard crash once we are happy it should be impossible scenario.
  private def warnOnCreditDifference(zuoraHolidayWriteResult: ZuoraHolidayWriteResult): Unit = {
    import cats.implicits._
    (zuoraHolidayWriteResult.estimatedPrice, Some(zuoraHolidayWriteResult.actualPrice)).mapN { (estimated, actual) =>
      if (estimated.value != actual.value)
        logger.warn(
          s"""Difference between actual and estimated credit
           |in sub ${zuoraHolidayWriteResult.subscriptionName.value},
           |stop ${zuoraHolidayWriteResult.requestId.value}. Investigate ASAP!
           |estimated.value=${estimated.value}; actual.value=${actual.value}""".stripMargin
        )
      // throw new RuntimeException(s"Difference between actual and estimated credit. Investigate ASAP! estimated.value=${estimated.value}; actual.value=${actual.value}")
    }
  }
}

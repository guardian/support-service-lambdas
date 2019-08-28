package com.gu.holidaystopprocessor

import com.gu.holiday_stops.{HolidayStop, OverallFailure, ZuoraHolidayWriteError}
import com.typesafe.scalalogging.LazyLogging

case class ProcessResult(holidayStopsToApply: List[HolidayStop], holidayStopResults: List[Either[ZuoraHolidayWriteError, HolidayStopResponse]], resultsToExport: List[HolidayStopResponse], overallFailure: Option[OverallFailure])

object ProcessResult extends LazyLogging {
  def apply(failure: OverallFailure): ProcessResult =
    ProcessResult(Nil, Nil, Nil, Some(failure))

  def log(processResult: ProcessResult): Unit = {
    import processResult._
    logger.info(s"${holidayStopsToApply.size} holiday stops to apply:")
    holidayStopsToApply.foreach(stop => logger.info(stop.toString))
    holidayStopResults foreach {
      case Left(failure) => logger.error(failure.reason)
      case Right(response) => logger.info(response.toString)
    }
  }
}

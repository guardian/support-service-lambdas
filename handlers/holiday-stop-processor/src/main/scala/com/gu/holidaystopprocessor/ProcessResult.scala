package com.gu.holidaystopprocessor

import com.typesafe.scalalogging.LazyLogging

case class ProcessResult(
  holidayStopsToApply: Seq[HolidayStop],
  holidayStopResults: Seq[Either[HolidayStopFailure, HolidayStopResponse]],
  resultsToExport: Seq[HolidayStopResponse],
  overallFailure: Option[OverallFailure]
)

object ProcessResult extends LazyLogging {
  def fromOverallFailure(failure: OverallFailure) = ProcessResult(Nil, Nil, Nil, Some(failure))

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

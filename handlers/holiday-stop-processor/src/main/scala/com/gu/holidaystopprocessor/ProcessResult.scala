package com.gu.holidaystopprocessor

case class ProcessResult(
  holidayStopsToApply: Seq[HolidayStop],
  holidayStopResults: Seq[Either[HolidayStopFailure, HolidayStopResponse]],
  resultsToExport: Seq[HolidayStopResponse],
  overallFailure: Option[OverallFailure]
)

object ProcessResult {
  def fromOverallFailure(failure: OverallFailure) = ProcessResult(Nil, Nil, Nil, Some(failure))
}

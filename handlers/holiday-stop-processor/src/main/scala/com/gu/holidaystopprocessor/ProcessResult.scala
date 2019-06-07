package com.gu.holidaystopprocessor

case class ProcessResult(
  holidayStopsToApply: Seq[HolidayStop],
  holidayStopResults: Seq[Either[HolidayStopFailure, HolidayStopResponse]],
  overallFailure: Option[OverallFailure]
)

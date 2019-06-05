package com.gu.holidaystopprocessor

case class ProcessResult(
  overallFailure: Option[OverallFailure],
  holidayStopResults: Seq[Either[HolidayStopFailure, HolidayStopResponse]]
)

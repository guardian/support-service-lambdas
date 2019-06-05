package com.gu.holidaystopprocessor

// A failure to process an individual holiday stop
case class HolidayStopFailure(reason: String)

// A general failure during the processing of holiday stops, but not caused by any particular holiday stop
case class OverallFailure(reason: String)

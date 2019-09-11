package com.gu.holidaystopprocessor

import com.gu.holiday_stops.Fixtures
import org.scalatest.{FlatSpec, Matchers}

class SundayHolidayStopProcessTest extends FlatSpec with Matchers {
  "SundayHolidayStopProcess" should "not process anything" in {
    SundayHolidayStopProcessor.processHolidayStops(
      Fixtures.sundayHolidayStopConfig,
      _ => throw new RuntimeException(),
      _ => throw new RuntimeException(),
      (_, _) => throw new RuntimeException(),
      _ => throw new RuntimeException()
    ) should equal(ProcessResult(Nil, Nil, Nil, None))
  }
}

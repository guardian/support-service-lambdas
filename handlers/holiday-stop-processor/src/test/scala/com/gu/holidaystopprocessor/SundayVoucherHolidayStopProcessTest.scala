package com.gu.holidaystopprocessor

import com.gu.holiday_stops.Fixtures
import org.scalatest.{FlatSpec, Matchers}

class SundayVoucherHolidayStopProcessTest extends FlatSpec with Matchers {
  "SundayVoucherHolidayStopProcess" should "not process anything" in {
    SundayVoucherHolidayStopProcessor.processHolidayStops(
      Fixtures.sundayVoucherHolidayStopConfig,
      (_, _) => throw new RuntimeException(),
      _ => throw new RuntimeException(),
      (_, _) => throw new RuntimeException(),
      _ => throw new RuntimeException(),
      None
    ) should equal(ProcessResult(Nil, Nil, Nil, None))
  }
}

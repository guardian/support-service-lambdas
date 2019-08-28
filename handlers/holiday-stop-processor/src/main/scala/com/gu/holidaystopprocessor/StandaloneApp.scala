package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.holiday_stops.Config

// This is just for functional testing locally.
object StandaloneApp extends App {

  val stopDate = args.headOption.map(LocalDate.parse)

  Config() match {
    case Left(msg) => println(s"Config failure: $msg")
    case Right(config) =>
      val processResult = HolidayStopProcess(config, stopDate)

      println(processResult.holidayStopsToApply.size)

      processResult.overallFailure foreach { failure =>
        println(s"Overall failure: ${failure.reason}")
      }
      processResult.holidayStopResults foreach {
        case Left(failure) => println(s"Failed: ${failure.reason}")
        case Right(response) => println(s"Success: $response")
      }
  }
}

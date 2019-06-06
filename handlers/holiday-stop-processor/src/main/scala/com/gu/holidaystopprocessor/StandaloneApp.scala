package com.gu.holidaystopprocessor

// This is just for functional testing locally.
object StandaloneApp extends App {

  Config() match {
    case Left(msg) => println(s"Config failure: $msg")
    case Right(config) =>
      val processResult = HolidayStopProcess(config)

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

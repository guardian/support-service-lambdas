package com.gu.holidaystopprocessor

// This is just for functional testing locally.
object StandaloneApp extends App {

  Config() match {
    case Left(msg) => println(s"Config failure: $msg")
    case Right(config) =>
      HolidayStopProcess(config) foreach {
        case Left(msg) => println(s"Failed: $msg")
        case Right(response) => println(s"Success: $response")
      }
  }
}

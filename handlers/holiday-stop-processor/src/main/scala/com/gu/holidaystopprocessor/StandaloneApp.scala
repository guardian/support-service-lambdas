package com.gu.holidaystopprocessor

import java.time.LocalDate

// This is just for functional testing locally.
object StandaloneApp extends App {

  val subscriptionName = "A-S00050605"
  val stoppedPublicationDate = LocalDate.of(2019, 7, 11)

  Config() match {
    case Left(msg) => println(s"Config failure: $msg")
    case Right(config) =>
      HolidayStopProcess(config)(
        HolidayStop(subscriptionName, stoppedPublicationDate)
      ) match {
          case Left(msg) => println(s"Failed: $msg")
          case Right(r) => println(s"Success: $r")
        }
  }
}

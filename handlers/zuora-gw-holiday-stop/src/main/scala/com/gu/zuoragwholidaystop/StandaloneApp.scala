package com.gu.zuoragwholidaystop

import java.time.LocalDate

object StandaloneApp extends App {

  val subscriptionName = "A-S00050605"
  val stoppedPublicationDate = LocalDate.of(2019, 8, 23)

  val zuoraUrl = args(0)
  val bearerToken = args(1)

  val holidayCreditProductRatePlanId = "2c92c0f9671686a201671d14b5e5771e"
  val holidayCreditProductRatePlanChargeId = "2c92c0f9671686ae01671d16ff8f6cd2"

  HolidayStopProcess(
    zuoraUrl,
    bearerToken,
    holidayCreditProductRatePlanId,
    holidayCreditProductRatePlanChargeId
  )(HolidayStop(subscriptionName, stoppedPublicationDate)) match {
    case Left(msg) => println(s"Failed: $msg")
    case Right(r)  => println(s"Success: $r")
  }
}

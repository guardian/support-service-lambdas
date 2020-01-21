package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.effects.GetFromS3
import com.gu.holiday_stops.Config
import com.gu.holidaystopprocessor.HolidayStopCreditProcessor.processAllProducts
import com.softwaremill.sttp.HttpURLConnectionBackend

// This is just for functional testing locally.
object StandaloneApp extends App {

  val stopDate = args.headOption.map(LocalDate.parse)

  Config(GetFromS3.fetchString) match {
    case Left(msg) => println(s"Config failure: $msg")
    case Right(config) =>
      val processResult = processAllProducts(config, stopDate, HttpURLConnectionBackend(), GetFromS3.fetchString)

      println(processResult.flatMap(_.creditsToApply).size)

      processResult.flatMap(_.overallFailure) foreach { failure =>
        println(s"Overall failure: ${failure.reason}")
      }
      processResult.flatMap(_.creditResults) foreach {
        case Left(failure) => println(s"Failed: ${failure.reason}")
        case Right(response) => println(s"Success: $response")
      }
  }
}

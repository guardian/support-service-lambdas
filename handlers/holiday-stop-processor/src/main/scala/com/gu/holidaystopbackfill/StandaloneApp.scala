package com.gu.holidaystopbackfill

import java.time.LocalDate

// This is backfill app to be run from a dev machine.
object StandaloneApp extends App {
  Backfiller.backfill(LocalDate.of(2017, 4, 1), Some(LocalDate.of(2021, 6, 1)), dryRun = true) match {
    case Left(failure) => println(s"Failed: $failure")
    case Right(result) =>
      println("Success!")
      println(s"${result.requests.length} requests written:")
      result.requests.foreach(println)
      println(s"${result.zuoraRefs.length} Zuora refs written:")
      result.zuoraRefs.foreach(println)
  }
}

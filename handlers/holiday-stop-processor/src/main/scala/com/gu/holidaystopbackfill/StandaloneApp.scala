package com.gu.holidaystopbackfill

import java.time.LocalDate

// This is backfill app to be run from a dev machine.
object StandaloneApp extends App {
  Backfiller.backfill(LocalDate.of(2018, 1, 1), Some(LocalDate.of(2018, 12, 31)), dryRun = true) match {
    case Left(failure) => println(s"Failed: $failure")
    case Right(result) =>
      println("Success!")
      println(s"${result.requests.length} requests written:")
      result.requests.foreach(println)
      println(s"${result.zuoraRefs.length} Zuora refs written:")
      result.zuoraRefs.foreach(println)
  }
}

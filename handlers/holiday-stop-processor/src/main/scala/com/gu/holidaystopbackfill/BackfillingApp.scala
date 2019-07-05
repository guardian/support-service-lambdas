package com.gu.holidaystopbackfill

import java.io.File
import java.time.LocalDate

/**
 * <p>Backfill app, to be run from a dev machine.</p>
 *
 * <p>Args:
 * <ol>
 *   <li>Dry run: true for do nothing but show what would happen, false for actually run.</li>
 *   <li>Location of file containing a tsv report of legacy holiday stops, with columns:
 *   <ol>
 *     <li>Subscription name.</li>
 *     <li>Charge number.</li>
 *     <li>Holiday start date.</li>
 *     <li>Holiday end date.</li>
 *     <li>Credit price.</ol></li>
 *   <li>Earliest date of start of holiday-stops to find.</li>
 *   <li>Latest date of end of holiday-stops to find.</li>
 * </ol>
 * </p>
 */
object BackfillingApp extends App {

  val dryRun = args(0).toBoolean
  val src = new File(args(1))
  val start = LocalDate.parse(args(2))
  val end = args.lift(3).map(LocalDate.parse)

  Backfiller.backfill(src, start, end, dryRun) match {
    case Left(failure) => println(s"Failed: $failure")
    case Right(result) =>
      println("Success!")
      println(s"${result.requests.length} requests written:")
      result.requests.foreach(println)
      println(s"${result.zuoraRefs.length} Zuora refs written:")
      result.zuoraRefs.foreach(println)
  }
}

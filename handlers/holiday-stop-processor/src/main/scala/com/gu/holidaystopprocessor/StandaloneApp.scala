package com.gu.holidaystopprocessor

import java.time.LocalDate

import com.gu.creditprocessor.ProcessResult
import com.gu.effects.GetFromS3
import com.gu.holiday_stops.{ConfigLive, Configuration}
import com.gu.holidaystopprocessor.HolidayStopCreditProcessor.processAllProducts
import com.softwaremill.sttp.HttpURLConnectionBackend
import zio.console.Console
import zio._

// This is just for functional testing locally.
object StandaloneApp extends App {

  def run(args: List[String]): ZIO[ZEnv, Nothing, Int] = {
    val stopDate = args.headOption.map(LocalDate.parse)
    val program = main(stopDate).provide(new Console.Live with ConfigLive {})
    program.fold(_ => 1, _ => 0)
  }

  def main(stopDate: Option[LocalDate]): RIO[Console with Configuration, Unit] =
    for {
      config <- Configuration.factory.config.tapError(e => console.putStrLn(s"Config failure: $e"))
      processResults <- ZIO.effect(processAllProducts(config, stopDate, HttpURLConnectionBackend(), GetFromS3.fetchString))
      _ <- showResults(processResults)
    } yield ()

  def showResults(processResults: List[ProcessResult[ZuoraHolidayCreditAddResult]]): URIO[Console, Unit] =
    for {
      _ <- console.putStrLn(processResults.flatMap(_.creditsToApply).size.toString)
      _ <- URIO.foreach(processResults.flatMap(_.overallFailure)) { failure =>
        console.putStrLn(s"Overall failure: ${failure.reason}")
      }
      _ <- URIO.foreach(processResults.flatMap(_.creditResults)) {
        case Left(failure) => console.putStrLn(s"Failed: ${failure.reason}")
        case Right(response) => console.putStrLn(s"Success: $response")
      }
    } yield ()
}

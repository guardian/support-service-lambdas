package com.gu.holidaystopprocessor

import java.io.Serializable
import java.time.LocalDate

import com.gu.effects.GetFromS3
import com.gu.holiday_stops.{ConfigLive, Configuration}
import com.softwaremill.sttp.HttpURLConnectionBackend
import zio.console._
import zio.{App, URIO, ZEnv, ZIO}

// This is just for functional testing locally.
object StandaloneApp extends App {

  def run(args: List[String]): ZIO[ZEnv, Nothing, Int] = {
    val stopDate = args.headOption.map(LocalDate.parse)
    val program = main(stopDate).provide(new Console.Live with ConfigLive {})
    program.fold(_ => 1, _ => 0)
  }

  def main(stopDate: Option[LocalDate]): ZIO[Console with Configuration, Serializable, Unit] =
    for {
      config <- Configuration.factory.config.tapError(e => putStrLn(s"Config failure: $e"))
      processResults <- ZIO.effect(Processor.processAllProducts(config, stopDate, HttpURLConnectionBackend(), GetFromS3.fetchString))
      _ <- showResults(processResults)
    } yield ()

  def showResults(processResults: List[ProcessResult]): URIO[Console, Unit] =
    for {
      _ <- putStrLn(processResults.flatMap(_.holidayStopsToApply).size.toString)
      _ <- ZIO.foreach(processResults.flatMap(_.overallFailure)) { failure =>
        putStrLn(s"Overall failure: ${failure.reason}")
      }
      _ <- ZIO.foreach(processResults.flatMap(_.holidayStopResults)) {
        case Left(failure) => putStrLn(s"Failed: ${failure.reason}")
        case Right(response) => putStrLn(s"Success: $response")
      }
    } yield ()
}

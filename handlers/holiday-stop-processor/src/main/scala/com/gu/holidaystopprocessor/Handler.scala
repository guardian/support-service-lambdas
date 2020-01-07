package com.gu.holidaystopprocessor

import java.time.LocalDate

import cats.implicits._
import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.GetFromS3
import com.gu.holiday_stops.{ConfigLive, Configuration, HolidayError}
import com.softwaremill.sttp.HttpURLConnectionBackend
import io.circe.generic.auto._
import io.github.mkotsur.aws.handler.Lambda
import io.github.mkotsur.aws.handler.Lambda._
import java.io.Serializable

import zio.console.{Console, putStrLn}
import zio.{DefaultRuntime, ZIO}

object Handler extends Lambda[Option[LocalDate], List[ZuoraHolidayWriteResult]] {

  private val runtime = new DefaultRuntime {}

  /**
   * @param processDateOverride
   *             The date for which relevant holiday stop requests will be processed.
   *             This is to facilitate testing.
   *             In normal use it will be missing and a default value will apply instead.
   */
  override def handle(processDateOverride: Option[LocalDate], context: Context): Either[Throwable, List[ZuoraHolidayWriteResult]] = {

    val main: ZIO[Console with Configuration, Serializable, List[ZuoraHolidayWriteResult]] =
      for {
        config <- Configuration.factory.config.tapError(e => putStrLn(s"Config failure: $e"))
        results <- ZIO.effect(Processor.processAllProducts(config, processDateOverride, HttpURLConnectionBackend(), GetFromS3.fetchString))
        _ <- ZIO.foreach(results)(result => ZIO.effect(ProcessResult.log(result)))
        zuoraWriteResults <- results.flatMap(_.overallFailure.toList) match {
          case Nil =>
            val (_, successfulZuoraResponses) = results.flatMap(_.holidayStopResults).separate
            ZIO.succeed(successfulZuoraResponses)
          case failures =>
            ZIO.fail(new RuntimeException(failures.map(_.reason).mkString("; ")))
        }
      } yield zuoraWriteResults

    runtime.unsafeRun {
      main.provide(new Console.Live with ConfigLive {})
        .mapError {
          case e: HolidayError => new RuntimeException(e.reason)
          case t: Throwable => t
        }.either
    }
  }
}

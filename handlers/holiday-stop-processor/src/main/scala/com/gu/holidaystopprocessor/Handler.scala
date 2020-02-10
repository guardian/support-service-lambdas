package com.gu.holidaystopprocessor

import java.time.LocalDate

import cats.implicits._
import com.amazonaws.services.lambda.runtime.Context
import com.gu.creditprocessor.ProcessResult
import com.gu.effects.GetFromS3
import com.gu.holiday_stops.{ConfigLive, Configuration}
import com.softwaremill.sttp.HttpURLConnectionBackend
import io.circe.generic.auto._
import io.github.mkotsur.aws.handler.Lambda
import io.github.mkotsur.aws.handler.Lambda._
import zio.console.Console
import zio.{DefaultRuntime, RIO, console}

object Handler extends Lambda[Option[LocalDate], List[ZuoraHolidayCreditAddResult]] {

  private val runtime = new DefaultRuntime {}

  /**
   * @param processDateOverride
   *             The date for which relevant holiday stop requests will be processed.
   *             This is to facilitate testing.
   *             In normal use it will be missing and a default value will apply instead.
   */
  override def handle(processDateOverride: Option[LocalDate], context: Context): Either[Throwable, List[ZuoraHolidayCreditAddResult]] = {

    val main: RIO[Console with Configuration, List[ZuoraHolidayCreditAddResult]] =
      for {
        config <- Configuration.factory.config.tapError(e => console.putStrLn(s"Config failure: $e"))
        results <- RIO.effect(HolidayStopCreditProcessor.processAllProducts(config, processDateOverride, HttpURLConnectionBackend(), GetFromS3.fetchString))
        _ <- RIO.foreach(results)(result => RIO.effect(ProcessResult.log(result)))
        zuoraWriteResults <- results.flatMap(_.overallFailure.toList) match {
          case Nil =>
            val (_, successfulZuoraResponses) = results.flatMap(_.creditResults).separate
            RIO.succeed(successfulZuoraResponses)
          case failures =>
            RIO.fail(new RuntimeException(failures.map(_.reason).mkString("; ")))
        }
      } yield zuoraWriteResults

    runtime.unsafeRun {
      main.provide(new Console.Live with ConfigLive {}).either
    }
  }
}

package com.gu.holidaystopprocessor

import java.time.LocalDate

import cats.implicits._
import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.GetFromS3
import com.gu.holiday_stops.Config
import com.softwaremill.sttp.HttpURLConnectionBackend
import io.circe.generic.auto._
import io.github.mkotsur.aws.handler.Lambda
import io.github.mkotsur.aws.handler.Lambda._

object Handler extends Lambda[Option[LocalDate], List[HolidayStopResponse]] {
  /**
   * @param processDateOverride
   *             The date for which relevant holiday stop requests will be processed.
   *             This is to facilitate testing.
   *             In normal use it will be missing and a default value will apply instead.
   */
  override def handle(processDateOverride: Option[LocalDate], context: Context): Either[Throwable, List[HolidayStopResponse]] = {
    Config(GetFromS3.fetchString) match {
      case Left(msg) =>
        Left(new RuntimeException(s"Config failure: $msg"))

      case Right(config) =>
        val results = HolidayStopProcess(config, processDateOverride, HttpURLConnectionBackend())
        results.foreach(result => ProcessResult.log(result))
        results.flatMap(_.overallFailure.toList) match {
          case Nil =>
            val (_, successfulZuoraResponses) = results.flatMap(_.holidayStopResults).separate
            Right(successfulZuoraResponses)
          case failures =>
            Left(new RuntimeException(failures.map(_.reason).mkString("; ")))

        }
    }
  }
}

package com.gu.holidaystopprocessor

import java.time.LocalDate

import cats.implicits._
import com.amazonaws.services.lambda.runtime.Context
import com.gu.holiday_stops.Config
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
    Config() match {
      case Left(msg) =>
        Left(new RuntimeException(s"Config failure: $msg"))

      case Right(config) =>
        val result = HolidayStopProcess(config, processDateOverride)
        ProcessResult.log(result)
        result.overallFailure match {
          case Some(failure) =>
            Left(new RuntimeException(failure.reason))

          case None =>
            val (_, successfulZuoraResponses) = result.holidayStopResults.separate
            Right(successfulZuoraResponses)
        }
    }
  }
}

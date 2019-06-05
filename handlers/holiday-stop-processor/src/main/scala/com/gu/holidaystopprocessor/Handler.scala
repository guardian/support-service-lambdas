package com.gu.holidaystopprocessor

import cats.implicits._
import com.amazonaws.services.lambda.runtime.Context
import com.gu.util.Logging
import io.circe.generic.auto._
import io.github.mkotsur.aws.handler.Lambda
import io.github.mkotsur.aws.handler.Lambda._

object Handler
  extends Lambda[HolidayStop, Seq[HolidayStopResponse]]
  with Logging {

  override protected def handle(
    holidayStop: HolidayStop,
    context: Context
  ): Either[Throwable, Seq[HolidayStopResponse]] = {

    Config() match {
      case Left(msg) => Left(new RuntimeException(s"Config failure: $msg"))
      case Right(config) =>
        val processResult = HolidayStopProcess(config)

        processResult.holidayStopResults foreach {
          case Left(failure) => logger.error(failure.reason)
          case Right(response) => logger.info(response)
        }

        processResult.overallFailure map
          { failure => Left(new RuntimeException(failure.reason)) } getOrElse
          {
            processResult.holidayStopResults.toList.sequence
              .leftMap { failure => new RuntimeException(failure.reason) }
          }
    }
  }
}

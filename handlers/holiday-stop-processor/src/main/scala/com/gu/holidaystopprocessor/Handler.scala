package com.gu.holidaystopprocessor

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
        val responses = HolidayStopProcess(config)

        responses foreach {
          case Left(msg) => logger.error(msg)
          case Right(response) => logger.info(response)
        }

        responses collectFirst {
          case Left(msg) => Left(new RuntimeException(msg))
        } getOrElse
          Right(responses collect { case Right(response) => response })
    }
  }
}

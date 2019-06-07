package com.gu.holidaystopprocessor

import cats.implicits._
import com.amazonaws.services.lambda.runtime.Context
import com.typesafe.scalalogging.LazyLogging
import io.circe.generic.auto._
import io.github.mkotsur.aws.handler.Lambda
import io.github.mkotsur.aws.handler.Lambda._

object Handler extends Lambda[None.type, Seq[HolidayStopResponse]] with LazyLogging {

  override protected def handle(
    `_`: None.type,
    context: Context
  ): Either[Throwable, Seq[HolidayStopResponse]] = {
    Config() match {
      case Left(msg) => Left(new RuntimeException(s"Config failure: $msg"))
      case Right(config) =>
        val processResult = HolidayStopProcess(config)

        logger.info(s"${processResult.holidayStopsToApply.size} holiday stops to apply:")
        processResult.holidayStopsToApply.foreach(stop => logger.info(stop.toString))

        processResult.holidayStopResults foreach {
          case Left(failure) => logger.error(failure.reason)
          case Right(response) => logger.info(response.toString)
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

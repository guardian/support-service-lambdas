package com.gu.holidaystopprocessor

import cats.implicits._
import com.amazonaws.services.lambda.runtime.Context
import io.circe.generic.auto._
import io.github.mkotsur.aws.handler.Lambda
import io.github.mkotsur.aws.handler.Lambda._

object Handler extends Lambda[None.type, List[HolidayStopResponse]] {
  override def handle(`_`: None.type, context: Context): Either[Throwable, List[HolidayStopResponse]] = {
    Config() match {
      case Left(msg) =>
        Left(new RuntimeException(s"Config failure: $msg"))

      case Right(config) =>
        val result = HolidayStopProcess(config)
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

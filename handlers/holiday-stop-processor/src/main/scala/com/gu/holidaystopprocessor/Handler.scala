package com.gu.holidaystopprocessor

import com.amazonaws.services.lambda.runtime.Context
import io.circe.generic.auto._
import io.github.mkotsur.aws.handler.Lambda
import io.github.mkotsur.aws.handler.Lambda._

object Handler extends Lambda[HolidayStop, String] {

  override protected def handle(
    holidayStop: HolidayStop,
    context: Context
  ): Either[Throwable, String] = {
    Config() match {
      case Left(msg) => Left(new RuntimeException(s"Config failure: $msg"))
      case Right(config) =>
        HolidayStopProcess(config)(holidayStop) match {
          case Left(msg) => Left(new RuntimeException(msg))
          case Right(r) => Right(r.toString)
        }
    }
  }
}

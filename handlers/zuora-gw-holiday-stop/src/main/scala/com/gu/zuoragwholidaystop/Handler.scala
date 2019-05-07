package com.gu.zuoragwholidaystop

import com.amazonaws.services.lambda.runtime.Context
import io.circe.generic.auto._
import io.github.mkotsur.aws.handler.Lambda
import io.github.mkotsur.aws.handler.Lambda._

object Handler extends Lambda[HolidayStop, String] {

  override protected def handle(
      holidayStop: HolidayStop,
      context: Context
  ): Either[Throwable, String] = {

    // todo from S3
    val zuoraUrl = ???
    val bearerToken = ???
    val holidayCreditProductRatePlanId = ???
    val holidayCreditProductRatePlanChargeId = ???

    val processed = HolidayStopProcess(
      zuoraUrl,
      bearerToken,
      holidayCreditProductRatePlanId,
      holidayCreditProductRatePlanChargeId
    ) _

    processed(holidayStop) match {
      case Left(msg) => Left(new RuntimeException(msg))
      case Right(r)  => Right(r.toString)
    }
  }
}

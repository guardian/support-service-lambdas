package com.gu.delivery_records_api

import cats.syntax.either._
import com.gu.http4s.Http4sLambdaHandler

object Handler extends Http4sLambdaHandler(
  DeliveryRecordsApiApp()
    .value
    .unsafeRunSync()
    .valueOr((error: DeliveryRecordsApiError) => throw new RuntimeException(error.toString))
)

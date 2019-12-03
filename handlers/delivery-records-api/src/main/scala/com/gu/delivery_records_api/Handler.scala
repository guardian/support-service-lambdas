package com.gu.delivery_records_api

import io.github.howardjohn.lambda.http4s.Http4sLambdaHandler
import cats.syntax.either._

object Handler extends Http4sLambdaHandler(
  DeliveryRecordsApiApp()
    .value
    .unsafeRunSync()
    .valueOr((error: DeliveryRecordsApiAppError) => throw new RuntimeException(error.toString))
)

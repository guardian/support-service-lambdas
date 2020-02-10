package com.gu.digital_voucher_api

import io.github.howardjohn.lambda.http4s.Http4sLambdaHandler
import cats.syntax.either._

object Handler extends Http4sLambdaHandler(
  DigitalVoucherApiApp()
    .value
    .unsafeRunSync()
    .valueOr((error: DigitalVoucherApiAppError) => throw new RuntimeException(error.toString))
)

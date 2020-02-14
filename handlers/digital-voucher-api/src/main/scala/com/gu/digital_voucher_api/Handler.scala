package com.gu.digital_voucher_api

import io.github.howardjohn.lambda.http4s.Http4sLambdaHandler
import cats.syntax.either._
import com.gu.AppIdentity

object Handler extends Http4sLambdaHandler(
  DigitalVoucherApiApp(AppIdentity.whoAmI(defaultAppName = "digital-voucher-api"))
    .value
    .unsafeRunSync()
    .valueOr((error: DigitalVoucherApiError) => throw new RuntimeException(error.toString))
)

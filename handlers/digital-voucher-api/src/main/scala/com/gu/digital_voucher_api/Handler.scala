package com.gu.digital_voucher_api

import cats.syntax.either._
import com.gu.AppIdentity
import com.gu.http4s.Http4sLambdaHandler

object Handler extends Http4sLambdaHandler(
  DigitalVoucherApiApp(AppIdentity.whoAmI(defaultAppName = "digital-voucher-api"))
    .value
    .unsafeRunSync()
    .valueOr((error: DigitalVoucherApiError) => throw new RuntimeException(error.toString))
)


package com.gu.digital_voucher_api

import cats.effect.IO
import cats.syntax.either._
import com.gu.AppIdentity
import com.gu.http4s.Http4sLambdaHandler
import sttp.client3.asynchttpclient.cats.AsyncHttpClientCatsBackend

import scala.concurrent.ExecutionContext

object Handler extends Http4sLambdaHandler({
  implicit val contextShift = IO.contextShift(ExecutionContext.global)
  AsyncHttpClientCatsBackend[IO]().flatMap { sttpBackend =>
    DigitalVoucherApiApp(AppIdentity.whoAmI(defaultAppName = "digital-voucher-api"), sttpBackend).value
  }.unsafeRunSync()
    .valueOr((error: DigitalVoucherApiError) => throw new RuntimeException(error.toString))
})

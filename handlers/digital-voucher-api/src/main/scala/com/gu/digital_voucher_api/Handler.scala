package com.gu.digital_voucher_api

import cats.syntax.either._
import com.gu.AppIdentity
import com.gu.http4s.Http4sLambdaHandler
import org.asynchttpclient.DefaultAsyncHttpClient

import scala.util.{Failure, Success, Try}

object Handler extends Http4sLambdaHandler({
  val httpClient = new DefaultAsyncHttpClient()
  Try(DigitalVoucherApiApp(AppIdentity.whoAmI(defaultAppName = "digital-voucher-api"), httpClient)
    .value
    .unsafeRunSync()
    .valueOr((error: DigitalVoucherApiError) => throw new RuntimeException(error.toString))) match {
    case Failure(exception) =>
      httpClient.close()
      throw exception
    case Success(routes) =>
      httpClient.close()
      routes
  }
})

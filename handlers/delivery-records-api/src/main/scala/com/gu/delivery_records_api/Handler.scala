package com.gu.delivery_records_api

import cats.effect.{ContextShift, IO}
import cats.syntax.either._
import com.gu.http4s.Http4sLambdaHandler
import sttp.client3.asynchttpclient.cats.AsyncHttpClientCatsBackend

import scala.concurrent.ExecutionContext

object Handler
    extends Http4sLambdaHandler({
      implicit val contextShift: ContextShift[IO] = IO.contextShift(ExecutionContext.global)
      AsyncHttpClientCatsBackend[IO]()
        .flatMap { sttpBackend =>
          DeliveryRecordsApiApp.buildHttpRoutes(sttpBackend).value
        }
        .unsafeRunSync()
        .valueOr((error: DeliveryRecordsApiError) => throw new RuntimeException(error.toString))
    })

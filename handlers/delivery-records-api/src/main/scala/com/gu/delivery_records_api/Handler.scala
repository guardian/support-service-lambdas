package com.gu.delivery_records_api

import cats.effect.IO
import cats.syntax.either._
import com.gu.http4s.Http4sLambdaHandler
import sttp.client3.asynchttpclient.cats.AsyncHttpClientCatsBackend

import scala.concurrent.ExecutionContext

object Handler
    extends Http4sLambdaHandler({
      implicit val contextShift = IO.contextShift(ExecutionContext.global)
      AsyncHttpClientCatsBackend[IO]()
        .flatMap { sttpBackend =>
          DeliveryRecordsApiApp(sttpBackend).value
        }
        .unsafeRunSync()
        .valueOr((error: DeliveryRecordsApiError) => throw new RuntimeException(error.toString))
    })

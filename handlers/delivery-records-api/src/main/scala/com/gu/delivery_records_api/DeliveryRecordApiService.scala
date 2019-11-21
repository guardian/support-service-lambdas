package com.gu.delivery_records_api

import cats.effect.IO
import org.http4s.{HttpRoutes, HttpService}
import org.http4s.dsl.io._

object DeliveryRecordApiService {
  def apply(): HttpRoutes[IO] = {
    HttpRoutes.of {
      case GET -> Root / "delivery-records" / name => Ok(s"{}")
    }
  }
}

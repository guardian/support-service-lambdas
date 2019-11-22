package com.gu.delivery_records_api

import cats.effect.IO
import org.http4s.HttpRoutes

object DeliveryRecordsApiApp {
  def apply(): IO[HttpRoutes[IO]] = {
    IO(DeliveryRecordApiRoutes(DeliveryRecordsService()))
  }
}

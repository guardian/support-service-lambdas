package com.gu.delivery_records_api

import cats.effect.IO
import org.http4s.HttpRoutes
import org.http4s.dsl.io._
import io.circe.generic.auto._
import org.http4s.circe.CirceEntityEncoder._

object DeliveryRecordApiRoutes {
  def apply(deliveryRecordsService: DeliveryRecordsService): HttpRoutes[IO] = {
    HttpRoutes.of {
      case GET -> Root / "delivery-records" / subscriptionNumber =>
        Ok(deliveryRecordsService.getDeliveryRecordsForSubscription(subscriptionNumber).value)
    }
  }
}

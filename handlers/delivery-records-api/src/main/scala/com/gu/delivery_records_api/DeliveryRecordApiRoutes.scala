package com.gu.delivery_records_api

import cats.data.EitherT
import cats.effect.IO
import org.http4s.{EntityEncoder, HttpRoutes, Response}
import org.http4s.dsl.io._
import io.circe.generic.auto._
import org.http4s.circe.CirceEntityEncoder._
import cats.implicits._

object DeliveryRecordApiRoutes {
  def apply(deliveryRecordsService: DeliveryRecordsService): HttpRoutes[IO] = {
    HttpRoutes.of {
      case GET -> Root / "delivery-records" / subscriptionNumber =>
        toResponse(deliveryRecordsService.getDeliveryRecordsForSubscription(subscriptionNumber))
    }
  }

  private def toResponse[A](result: EitherT[IO, DeliveryRecordServiceError, A])(implicit enc: EntityEncoder[IO, A]) = {
    result
      .fold(
        Ok(_),
        InternalServerError(_)
      ).flatten
  }
}

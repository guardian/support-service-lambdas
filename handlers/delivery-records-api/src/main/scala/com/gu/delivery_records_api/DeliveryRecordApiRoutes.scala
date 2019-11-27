package com.gu.delivery_records_api

import cats.data.EitherT
import cats.effect.IO
import org.http4s.{EntityEncoder, HttpRoutes, Response}
import org.http4s.dsl.io._
import io.circe.generic.auto._
import org.http4s.circe.CirceEntityEncoder._
import cats.implicits._
import com.gu.salesforce.SalesforceHandlerSupport

object DeliveryRecordApiRoutes {
  def apply(deliveryRecordsService: DeliveryRecordsService): HttpRoutes[IO] = {
    HttpRoutes.of {
      case request @ GET -> Root / "delivery-records" / subscriptionNumber =>
        toResponse(
          for {
            contact <- SalesforceHandlerSupport
              .extractContactFromHeaders(
                request.headers.toList.map(header => header.name.value -> header.value)
              )
              .toEitherT[IO]
              .leftMap(error => BadRequest(error))

            records <- deliveryRecordsService
              .getDeliveryRecordsForSubscription(subscriptionNumber, contact)
              .leftMap {
                case error: DeliveryRecordServiceSubscriptionNotFound =>
                  NotFound(error)
                case error: DeliveryRecordServiceGenericError =>
                  InternalServerError(error)
              }
          } yield records
        )
    }
  }

  private def toResponse[A](result: EitherT[IO, IO[Response[IO]], A])(implicit enc: EntityEncoder[IO, A]): IO[Response[IO]] = {
    result
      .fold(
        identity,
        value => Ok(value)
      )
      .flatten
  }
}

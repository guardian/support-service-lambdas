package com.gu.delivery_records_api

import cats.Monad
import cats.data.EitherT
import cats.effect.Effect
import org.http4s.{EntityEncoder, HttpRoutes, Response}
import io.circe.generic.auto._
import org.http4s.circe.CirceEntityEncoder._
import cats.implicits._
import com.gu.salesforce.SalesforceHandlerSupport
import org.http4s.dsl.Http4sDsl

object DeliveryRecordApiRoutes {
  def apply[F[_]: Monad: Effect](deliveryRecordsService: DeliveryRecordsService[F]): HttpRoutes[F] = {
    object http4sDsl extends Http4sDsl[F]
    import http4sDsl._

    def toResponse[A](result: EitherT[F, F[Response[F]], A])(implicit enc: EntityEncoder[F, A]): F[Response[F]] = {
      result
        .fold(
          identity,
          value => Ok(value)
        )
        .flatMap(identity)
    }

    HttpRoutes.of[F] {
      case request @ GET -> Root / "delivery-records" / subscriptionNumber =>
        toResponse(
          for {
            contact <- SalesforceHandlerSupport
              .extractContactFromHeaders(
                request.headers.toList.map(header => header.name.value -> header.value)
              )
              .toEitherT[F]
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
}

package com.gu.delivery_records_api

import cats.Monad
import cats.data.EitherT
import cats.effect.Effect
import org.http4s.{EntityEncoder, HttpRoutes, Request, Response}
import io.circe.generic.auto._
import org.http4s.circe.CirceEntityEncoder._
import cats.implicits._
import com.gu.salesforce.{Contact, SalesforceHandlerSupport}
import org.http4s.dsl.Http4sDsl

object DeliveryRecordApiRoutes {
  def apply[F[_]: Effect](deliveryRecordsService: DeliveryRecordsService[F]): HttpRoutes[F] = {
    object http4sDsl extends Http4sDsl[F]
    import http4sDsl._

    def getContactFromHeaders(request: Request[F]): EitherT[F, F[Response[F]], Contact] = {
      SalesforceHandlerSupport
        .extractContactFromHeaders(
          request.headers.toList.map(header => header.name.value -> header.value)
        )
        .toEitherT[F]
        .leftMap(error => BadRequest(error))
    }

    def getDeliveryRecords(
      subscriptionNumber: String, contact: Contact
    ): EitherT[F, F[Response[F]], DeliveryRecordsApiResponse[DeliveryRecord]] = {
      deliveryRecordsService
        .getDeliveryRecordsForSubscription(subscriptionNumber, contact)
        .bimap(
          {
            case error: DeliveryRecordServiceSubscriptionNotFound =>
              NotFound(error)
            case error: DeliveryRecordServiceGenericError =>
              InternalServerError(error)
          },
          deliveryRecords => DeliveryRecordsApiResponse(deliveryRecords)
        )
    }

    def toResponse[A](result: EitherT[F, F[Response[F]], A])(implicit enc: EntityEncoder[F, A]): F[Response[F]] = {
      result
        .fold(
          identity,
          value => Ok(value)
        )
        .flatten
    }

    HttpRoutes.of[F] {
      case request @ GET -> Root / "delivery-records" / subscriptionNumber =>
        toResponse(
          for {
            contact <- getContactFromHeaders(request)
            records <- getDeliveryRecords(subscriptionNumber, contact)
          } yield records
        )
    }
  }
}

package com.gu.delivery_records_api

import java.time.LocalDate

import cats.data.EitherT
import cats.effect.Effect
import org.http4s.{EntityEncoder, HttpRoutes, Request, Response}
import io.circe.generic.auto._
import org.http4s.circe.CirceEntityEncoder._
import cats.implicits._
import com.gu.salesforce.sttp.SFApiCompositeResponse
import com.gu.salesforce.{Contact, SalesforceHandlerSupport}
import org.http4s.dsl.Http4sDsl
import org.http4s.circe.CirceEntityDecoder._

case class DeliveryRecordApiRoutesError(message: String)

object DeliveryRecordApiRoutes {

  def apply[F[_]: Effect](deliveryRecordsService: DeliveryRecordsService[F]): HttpRoutes[F] = {
    type RouteResult[A] = EitherT[F, F[Response[F]], A]
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
      subscriptionNumber: String,
      contact: Contact,
      optionalStartDate: Option[LocalDate],
      optionalEndDate: Option[LocalDate]
    ): EitherT[F, F[Response[F]], DeliveryRecordsApiResponse] = {
      deliveryRecordsService
        .getDeliveryRecordsForSubscription(subscriptionNumber, contact, optionalStartDate, optionalEndDate)
        .leftMap {
          case error: DeliveryRecordServiceSubscriptionNotFound =>
            NotFound(error)
          case error: DeliveryRecordServiceGenericError =>
            InternalServerError(error)
        }
    }

    case class CreateDeliveryProblemBody(
      productName: String,
      description: Option[String],
      problemType: String,
      recordIds: List[String]
    )

    def createDeliveryProblem(
      subscriptionNumber: String,
      contact: Contact,
      productName: String,
      description: Option[String],
      problemType: String,
      recordIds: List[String]
    ): EitherT[F, F[Response[F]], SFApiCompositeResponse] =
      deliveryRecordsService.createDeliveryProblemForSubscription(subscriptionNumber, contact, productName, description, problemType, recordIds)
        .leftMap(InternalServerError(_))

    def parseDateFromQueryString(request: Request[F], queryParameterKey: String): EitherT[F, F[Response[F]], Option[LocalDate]] = {
      request
        .params
        .get(queryParameterKey)
        .traverse[RouteResult, LocalDate] {
          queryStringValue =>
            Either
              .catchNonFatal(LocalDate.parse(queryStringValue))
              .leftMap(ex =>
                BadRequest(DeliveryRecordApiRoutesError(
                  s"$queryParameterKey should be formatted yyyy-MM-dd"
                )))
              .toEitherT
        }
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
            startDate <- parseDateFromQueryString(request, "startDate")
            endDate <- parseDateFromQueryString(request, "endDate")
            records <- getDeliveryRecords(
              subscriptionNumber,
              contact,
              startDate,
              endDate
            )
          } yield records
        )

      case request @ POST -> Root / "delivery-records" / subscriptionNumber =>
        toResponse(
          for {
            contact <- getContactFromHeaders(request)
            body <- request.attemptAs[CreateDeliveryProblemBody]
              .leftMap(error =>
                BadRequest(DeliveryRecordApiRoutesError(error.getMessage)))
            _ <- createDeliveryProblem(
              subscriptionNumber,
              contact,
              body.productName,
              body.description,
              body.problemType,
              body.recordIds
            )
            records <- getDeliveryRecords(
              subscriptionNumber,
              contact,
              None,
              None
            )
          } yield records
        )

    }
  }
}

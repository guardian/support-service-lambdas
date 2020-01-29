package com.gu.digital_voucher_api

import cats.data.EitherT
import cats.effect.Effect
import org.http4s.{EntityEncoder, HttpRoutes, Request, Response}
import io.circe.generic.auto._
import org.http4s.circe.CirceEntityEncoder._
import org.http4s.circe.CirceEntityDecoder._
import cats.implicits._
import io.circe.Decoder
import org.http4s.dsl.Http4sDsl

case class DigitalVoucherApiRoutesError(message: String)

case class CreateVoucherRequestBody(ratePlanName: String)

object DigitalVoucherApiRoutes {

  def apply[F[_]: Effect](digitalVoucherService: DigitalVoucherService[F]): HttpRoutes[F] = {
    type RouteResult[A] = EitherT[F, F[Response[F]], A]
    object http4sDsl extends Http4sDsl[F]
    import http4sDsl._

    def toResponse[A](result: EitherT[F, F[Response[F]], A])(implicit enc: EntityEncoder[F, A]): F[Response[F]] = {
      result
        .fold(
          identity,
          value => Ok(value)
        )
        .flatten
    }

    def parseRequest[A: Decoder](request: Request[F]) = {
      request
        .attemptAs[A]
        .leftMap { decodingFailure =>
          BadRequest(DigitalVoucherApiRoutesError(s"Failed to decoded request body: $decodingFailure"))
        }
    }

    HttpRoutes.of[F] {
      case request @ PUT -> Root / "digital-voucher" / "create" / subscriptionId =>
        toResponse(
          for {
            requestBody <- parseRequest[CreateVoucherRequestBody](request)
            voucher <- digitalVoucherService.createVoucherForSubscription(
              subscriptionId,
              requestBody.ratePlanName
            ).leftMap(_ => InternalServerError())
          } yield voucher
        )
    }
  }

}

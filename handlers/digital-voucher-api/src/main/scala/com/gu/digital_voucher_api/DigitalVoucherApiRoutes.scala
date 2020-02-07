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

    def handleCreateRequest(request: Request[F], subscriptionId: String) = {
      toResponse(
        for {
          requestBody <- parseRequest[CreateVoucherRequestBody](request)
          voucher <- digitalVoucherService.createVoucher(
            subscriptionId,
            requestBody.ratePlanName
          ).leftMap(_ => InternalServerError())
        } yield voucher
      )
    }

    def handleReplaceRequest(request: Request[F]) = {
      toResponse(
        for {
          requestBody <- parseRequest[Voucher](request)
          voucher <- digitalVoucherService.replaceVoucher(
            requestBody
          ).leftMap(_ => InternalServerError())
        } yield voucher
      )
    }

    def handleGetRequest(subscriptionId: String) = {
      toResponse(
        digitalVoucherService
          .getVoucher(subscriptionId)
          .leftMap(_ => InternalServerError())
      )
    }

    def handleDeleteRequest(subscriptionId: String) = {
      toResponse(
        digitalVoucherService
          .deleteVoucherForSubscription(subscriptionId)
          .leftMap(_ => InternalServerError())
      )
    }

    HttpRoutes.of[F] {
      case request @ PUT -> Root / "digital-voucher" / "create" / subscriptionId =>
        handleCreateRequest(request, subscriptionId)
      case request @ POST -> Root / "digital-voucher" / "replace" =>
        handleReplaceRequest(request)
      case GET -> Root / "digital-voucher" / subscriptionId =>
        handleGetRequest(subscriptionId)
      case DELETE -> Root / "digital-voucher" / subscriptionId =>
        handleDeleteRequest(subscriptionId)
    }
  }
}

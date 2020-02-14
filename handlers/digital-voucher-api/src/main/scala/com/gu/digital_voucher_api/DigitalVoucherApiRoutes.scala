package com.gu.digital_voucher_api

import java.time.LocalDate

import cats.Show
import cats.data.EitherT
import cats.effect.Effect
import org.http4s.{DecodeFailure, EntityEncoder, HttpRoutes, InvalidMessageBodyFailure, MalformedMessageBodyFailure, Request, Response}
import io.circe.generic.auto._
import org.http4s.circe.CirceEntityEncoder._
import org.http4s.circe.CirceEntityDecoder._
import cats.implicits._
import io.circe.Decoder
import org.http4s.dsl.Http4sDsl

case class DigitalVoucherApiRoutesError(message: String)

case class CreateVoucherRequestBody(ratePlanName: String)

case class CancelVoucherRequestBody(cardCode: String, letterCode: String, cancellationDate: LocalDate)

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
      implicit val showDecodeFailure = Show.show[DecodeFailure] {
        case InvalidMessageBodyFailure(details, cause) => s"InvalidMessageBodyFailure($details, $cause)"
        case MalformedMessageBodyFailure(details, cause) => s"MalformedMessageBodyFailure($details, $cause)"
        case error => error.toString
      }

      request
        .attemptAs[A]
        .leftMap { decodingFailure: DecodeFailure =>
          BadRequest(DigitalVoucherApiRoutesError(s"Failed to decoded request body: ${decodingFailure.show}"))
        }
    }

    def handleCreateRequest(request: Request[F], subscriptionId: String) = {
      toResponse(
        for {
          requestBody <- parseRequest[CreateVoucherRequestBody](request)
          voucher <- digitalVoucherService.createVoucher(
            subscriptionId,
            requestBody.ratePlanName
          ).leftMap(error => InternalServerError(DigitalVoucherApiRoutesError(s"Failed create voucher: $error")))
        } yield voucher
      )
    }

    def handleReplaceRequest(request: Request[F]) = {
      toResponse(
        for {
          requestBody <- parseRequest[Voucher](request)
          voucher <- digitalVoucherService.replaceVoucher(
            requestBody
          ).leftMap(error => InternalServerError(DigitalVoucherApiRoutesError(s"Failed replace voucher: $error")))
        } yield voucher
      )
    }

    def handleGetRequest(subscriptionId: String) = {
      toResponse(
        digitalVoucherService
          .getVoucher(subscriptionId)
          .leftMap(error => InternalServerError(DigitalVoucherApiRoutesError(s"Failed get voucher: $error")))
      )
    }

    def handleCancelRequest(request: Request[F]) = {
      toResponse(
        for {
          requestBody <- parseRequest[CancelVoucherRequestBody](request)
          result <- digitalVoucherService
            .cancelVouchers(requestBody.cardCode, requestBody.letterCode, requestBody.cancellationDate)
            .leftMap(error => InternalServerError(DigitalVoucherApiRoutesError(s"Failed get voucher: $error")))
        } yield result

      )
    }

    HttpRoutes.of[F] {
      case request @ PUT -> Root / "digital-voucher" / "create" / subscriptionId =>
        handleCreateRequest(request, subscriptionId)
      case request @ POST -> Root / "digital-voucher" / "replace" =>
        handleReplaceRequest(request)
      case GET -> Root / "digital-voucher" / subscriptionId =>
        handleGetRequest(subscriptionId)
      case request @ POST -> Root / "digital-voucher" / "cancel" =>
        handleCancelRequest(request)
    }
  }
}

package com.gu.digital_voucher_api

import java.time.LocalDate

import cats.Show
import cats.data.EitherT
import cats.effect.Effect
import cats.implicits._
import io.circe.Decoder
import io.circe.generic.auto._
import org.http4s.circe.CirceEntityDecoder._
import org.http4s.circe.CirceEntityEncoder._
import org.http4s.dsl.Http4sDsl
import org.http4s.{DecodeFailure, HttpRoutes, InvalidMessageBodyFailure, MalformedMessageBodyFailure, Request, Response}

case class DigitalVoucherApiRoutesError(message: String)

case class CreateVoucherRequestBody(ratePlanName: String)

case class CancelVoucherRequestBody(cardCode: String, cancellationDate: LocalDate)

object DigitalVoucherApiRoutes {

  def apply[F[_]: Effect](digitalVoucherService: DigitalVoucherService[F]): HttpRoutes[F] = {
    type RouteResult[A] = EitherT[F, F[Response[F]], A]
    object http4sDsl extends Http4sDsl[F]
    import http4sDsl._

    def toResponse(result: EitherT[F, F[Response[F]], F[Response[F]]]): F[Response[F]] = {
      result.fold(identity, identity).flatten
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

    def handleOldCreateRequest(request: Request[F], subscriptionId: SfSubscriptionId) = {
      toResponse(
        for {
          requestBody <- parseRequest[CreateVoucherRequestBody](request)
          voucher <- digitalVoucherService
            .oldCreateVoucher(subscriptionId, RatePlanName(requestBody.ratePlanName))
            .leftMap {
              case DigitalVoucherApiException(InvalidArgumentException(msg)) =>
                // see https://tools.ietf.org/html/rfc4918#section-11.2
                UnprocessableEntity(DigitalVoucherApiRoutesError(s"Bad request argument: $msg"))
              case DigitalVoucherApiException(ImovoClientException(msg)) =>
                BadGateway(DigitalVoucherApiRoutesError(s"Imovo failure to create voucher: $msg"))
              case error =>
                InternalServerError(DigitalVoucherApiRoutesError(s"Failed create voucher: $error"))
            }
        } yield Created(voucher)
      )
    }

    def handleCreateRequest(request: Request[F], subscriptionId: SfSubscriptionId) = {
      toResponse(
        for {
          requestBody <- parseRequest[CreateVoucherRequestBody](request)
          voucher <- digitalVoucherService
            .createVoucher(subscriptionId, RatePlanName(requestBody.ratePlanName))
            .leftMap {
              case DigitalVoucherApiException(InvalidArgumentException(msg)) =>
                // see https://tools.ietf.org/html/rfc4918#section-11.2
                UnprocessableEntity(DigitalVoucherApiRoutesError(s"Bad request argument: $msg"))
              case DigitalVoucherApiException(ImovoClientException(msg)) =>
                BadGateway(DigitalVoucherApiRoutesError(s"Imovo failure to create voucher: $msg"))
              case error =>
                InternalServerError(DigitalVoucherApiRoutesError(s"Failed create voucher: $error"))
            }
        } yield Created(voucher)
      )
    }

    def handleReplaceRequest(request: Request[F]) = {
      toResponse(
        for {
          requestBody <- parseRequest[Voucher](request)
          voucher <- digitalVoucherService.replaceVoucher(
            requestBody
          ).leftMap(error => InternalServerError(DigitalVoucherApiRoutesError(s"Failed replace voucher: $error")))
        } yield Ok(voucher)
      )
    }

    def handleGetRequest(subscriptionId: String) = {
      toResponse(
        digitalVoucherService
          .getVoucher(subscriptionId)
          .bimap(
            error => InternalServerError(DigitalVoucherApiRoutesError(s"Failed get voucher: $error")),
            voucher => Ok(voucher)
          )
      )
    }

    def handleCancelRequest(request: Request[F]) = {
      toResponse(
        for {
          requestBody <- parseRequest[CancelVoucherRequestBody](request)
          result <- digitalVoucherService
            .cancelVouchers(requestBody.cardCode, requestBody.cancellationDate)
            .leftMap(error => InternalServerError(DigitalVoucherApiRoutesError(s"Failed get voucher: $error")))
        } yield Ok(result)
      )
    }

    HttpRoutes.of[F] {
      case request @ PUT -> Root / "digital-voucher" / "create" / subscriptionId =>
        handleOldCreateRequest(request, SfSubscriptionId(subscriptionId))
      case request @ PUT -> Root / "digital-voucher" / subscriptionId =>
        handleCreateRequest(request, SfSubscriptionId(subscriptionId))
      case request @ POST -> Root / "digital-voucher" / "replace" =>
        handleReplaceRequest(request)
      case GET -> Root / "digital-voucher" / subscriptionId =>
        handleGetRequest(subscriptionId)
      case request @ POST -> Root / "digital-voucher" / "cancel" =>
        handleCancelRequest(request)
    }
  }
}

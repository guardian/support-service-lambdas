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

case class CreateVoucherRequestBody(ratePlanName: RatePlanName)

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

    def handleCreateRequest(request: Request[F], subscriptionId: SfSubscriptionId) = {
      val response = for {
        requestBody <- parseRequest[CreateVoucherRequestBody](request)
        voucher <- digitalVoucherService
          .createVoucher(subscriptionId, requestBody.ratePlanName)
          .leftMap {
            case DigitalVoucherApiException(InvalidArgumentException(msg)) =>
              // see https://tools.ietf.org/html/rfc4918#section-11.2
              UnprocessableEntity(DigitalVoucherApiRoutesError(s"Bad request argument: $msg"))
            case DigitalVoucherApiException(ImovoClientException(msg)) =>
              BadGateway(DigitalVoucherApiRoutesError(s"Imovo failure to create voucher: $msg"))
            case error =>
              InternalServerError(DigitalVoucherApiRoutesError(s"Failed create voucher: $error"))
          }
      } yield voucher
      response.fold(
        identity,
        value => Created(value)
      ).flatten
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

    def handleDeleteRequest(subscriptionId: String) = {
      toResponse(
        digitalVoucherService
          .deleteVoucherForSubscription(subscriptionId)
          .leftMap(_ => InternalServerError())
      )
    }

    HttpRoutes.of[F] {
      case request @ PUT -> Root / "digital-voucher" / "create" / subscriptionId =>
        handleCreateRequest(request, SfSubscriptionId(subscriptionId))
      case request @ POST -> Root / "digital-voucher" / "replace" =>
        handleReplaceRequest(request)
      case GET -> Root / "digital-voucher" / subscriptionId =>
        handleGetRequest(subscriptionId)
      case DELETE -> Root / "digital-voucher" / subscriptionId =>
        handleDeleteRequest(subscriptionId)
    }
  }
}

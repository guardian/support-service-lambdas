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

case class CancelSubscriptionVoucherRequestBody(subscriptionId: String, cancellationDate: LocalDate)

case class SubscriptionActionRequestBody(subscriptionId: Option[String], cardCode: Option[String], letterCode: Option[String])

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
              case InvalidArgumentException(msg) =>
                // see https://tools.ietf.org/html/rfc4918#section-11.2
                UnprocessableEntity(DigitalVoucherApiRoutesError(s"Bad request argument: $msg"))
              case ImovoOperationFailedException(msg) =>
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
              case InvalidArgumentException(msg) =>
                // see https://tools.ietf.org/html/rfc4918#section-11.2
                UnprocessableEntity(DigitalVoucherApiRoutesError(s"Bad request argument: $msg"))
              case ImovoOperationFailedException(msg) =>
                BadGateway(DigitalVoucherApiRoutesError(s"Imovo failure to create voucher: $msg"))
              case error =>
                InternalServerError(DigitalVoucherApiRoutesError(s"Failed create voucher: $error"))
            }
        } yield Created(voucher)
      )
    }

    def handleReplaceRequest(request: Request[F]) = {
      def replaceSubscriptionVouchers(requestBody: SubscriptionActionRequestBody) = {
        for {
          subscriptionId <- requestBody.subscriptionId
            .toRight(UnprocessableEntity(DigitalVoucherApiRoutesError(s"subscriptionId is required")))
            .toEitherT[F]
          replacementVoucher <- digitalVoucherService
            .replaceVoucher(SfSubscriptionId(subscriptionId))
            .leftMap(error => InternalServerError(DigitalVoucherApiRoutesError(s"Failed replace voucher: $error")))
        } yield Ok(replacementVoucher)
      }

      def replaceVoucherCodes(requestBody: SubscriptionActionRequestBody) = {
        for {
          voucherToReplace <- (requestBody.cardCode, requestBody.letterCode)
            .mapN(Voucher.apply)
            .toRight(UnprocessableEntity(DigitalVoucherApiRoutesError(s"cardCode and letterCode are required.")))
            .toEitherT[F]
          replacementVoucher <- digitalVoucherService
            .replaceVoucher(voucherToReplace)
            .leftMap(error => InternalServerError(DigitalVoucherApiRoutesError(s"Failed replace voucher: $error")))
        } yield Ok(replacementVoucher)
      }

      toResponse(
        for {
          requestBody <- parseRequest[SubscriptionActionRequestBody](request)
          voucherResponse <- if (requestBody.subscriptionId.isDefined) {
            replaceSubscriptionVouchers(requestBody)
          } else {
            replaceVoucherCodes(requestBody)
          }
        } yield voucherResponse
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
          requestBody <- parseRequest[CancelSubscriptionVoucherRequestBody](request)
          result <- digitalVoucherService
            .cancelVouchers(SfSubscriptionId(requestBody.subscriptionId), requestBody.cancellationDate)
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

package com.gu.digital_voucher_api

import java.time.LocalDate

import cats.Show
import cats.data.EitherT
import cats.effect.Effect
import cats.syntax.all._
import io.circe.Decoder
import io.circe.generic.auto._
import org.http4s.circe.CirceEntityDecoder._
import org.http4s.circe.CirceEntityEncoder._
import org.http4s.dsl.Http4sDsl
import org.http4s.{DecodeFailure, HttpRoutes, InvalidMessageBodyFailure, MalformedMessageBodyFailure, Request, Response}
import com.gu.imovo.{ImovoSubscriptionType, SfSubscriptionId}
import com.gu.digital_voucher_api.ReplacementSubscriptionVouchers._

case class DigitalVoucherApiRoutesError(message: String)

case class CreateVoucherRequestBody(ratePlanName: String)

case class CancelSubscriptionVoucherRequestBody(subscriptionId: String, cancellationDate: LocalDate)

case class SuspendSubscriptionVoucherRequestBody(
    subscriptionId: Option[String],
    startDate: Option[LocalDate],
    endDateExclusive: Option[LocalDate],
)

case class SubscriptionActionRequestBody(
    subscriptionId: Option[String],
    cardCode: Option[String],
    letterCode: Option[String],
    replaceCard: Option[Boolean],
    replaceLetter: Option[Boolean],
)

case class RedemptionHistoryRequestBody(subscriptionId: String)

object DigitalVoucherApiRoutes {

  def apply[F[_]: Effect](digitalVoucherService: DigitalVoucherService[F]): HttpRoutes[F] = {
    type RouteResult[A] = EitherT[F, F[Response[F]], A]
    object http4sDsl extends Http4sDsl[F]
    import http4sDsl._

    def parseRequest[A: Decoder](request: Request[F]): EitherT[F, F[Response[F]], A] = {
      implicit val showDecodeFailure: Show[DecodeFailure] = Show.show[DecodeFailure] {
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

    def handleCreateRequest(request: Request[F], subscriptionId: SfSubscriptionId): F[Response[F]] = {
      (for {
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
      } yield Created(voucher)).merge.flatten
    }

    def handleReplaceRequest(request: Request[F]): F[Response[F]] = {
      (for {
        requestBody <- parseRequest[SubscriptionActionRequestBody](request)
        subscriptionId <- requestBody.subscriptionId
          .toRight(UnprocessableEntity(DigitalVoucherApiRoutesError(s"subscriptionId is required")))
          .toEitherT[F]
        replaceCard <- requestBody.replaceCard
          .toRight(
            UnprocessableEntity(
              DigitalVoucherApiRoutesError(s"replaceCard flag is required when asking for a replacement"),
            ),
          )
          .toEitherT[F]
        replaceLetter <- requestBody.replaceLetter
          .toRight(
            UnprocessableEntity(
              DigitalVoucherApiRoutesError(s"replaceLetter flag is required when asking for a replacement"),
            ),
          )
          .toEitherT[F]
        typeOfReplacement <- ImovoSubscriptionType
          .fromBooleans(replaceCard, replaceLetter)
          .toRight(
            UnprocessableEntity(
              DigitalVoucherApiRoutesError("Both replacement flags are set to false - nothing to replace"),
            ),
          )
          .toEitherT[F]
        _ = typeOfReplacement
        replacementVoucher <- digitalVoucherService
          .replaceVoucher(SfSubscriptionId(subscriptionId), typeOfReplacement)
          .leftMap(error => InternalServerError(DigitalVoucherApiRoutesError(s"Failed replace voucher: $error")))
      } yield Ok(replacementVoucher)).merge.flatten
    }

    def handleGetRequest(subscriptionId: String): F[Response[F]] = {
      digitalVoucherService
        .getVoucher(subscriptionId)
        .bimap(
          error => InternalServerError(DigitalVoucherApiRoutesError(s"Failed get voucher: $error")),
          voucher => Ok(voucher),
        )
        .merge
        .flatten
    }

    def handleCancelRequest(request: Request[F]): F[Response[F]] = {
      (for {
        requestBody <- parseRequest[CancelSubscriptionVoucherRequestBody](request)
        result <- digitalVoucherService
          .cancelVouchers(SfSubscriptionId(requestBody.subscriptionId), requestBody.cancellationDate)
          .leftMap(error => InternalServerError(DigitalVoucherApiRoutesError(s"Failed get voucher: $error")))
      } yield Ok(result)).merge.flatten
    }

    def handleSuspendRequest(request: Request[F]): F[Response[F]] =
      (for {
        requestBody <- parseRequest[SuspendSubscriptionVoucherRequestBody](request)
        subscriptionId <- requestBody.subscriptionId
          .toRight(UnprocessableEntity(DigitalVoucherApiRoutesError(s"subscriptionId is required")))
          .toEitherT[F]
        startDate <- requestBody.startDate
          .toRight(UnprocessableEntity(DigitalVoucherApiRoutesError(s"startDate is required")))
          .toEitherT[F]
        endDate <- requestBody.endDateExclusive
          .toRight(UnprocessableEntity(DigitalVoucherApiRoutesError(s"endDateExclusive is required")))
          .toEitherT[F]
        result <- digitalVoucherService
          .suspendVoucher(
            SfSubscriptionId(subscriptionId),
            startDate,
            endDate,
          )
          .leftMap {
            case ImovoOperationFailedException(msg) =>
              BadGateway(DigitalVoucherApiRoutesError(s"Imovo failure to suspend voucher: $msg"))
            case error =>
              InternalServerError(DigitalVoucherApiRoutesError(s"Failed to suspend voucher: $error"))
          }
      } yield Ok(result)).merge.flatten

    def handleRedemptionHistoryRequest(redemptionHistoryRequestBody: RedemptionHistoryRequestBody) = {
      (for {
        result <- digitalVoucherService
          .getRedemptionHistory(redemptionHistoryRequestBody.subscriptionId)
          .leftMap(error => InternalServerError(DigitalVoucherApiRoutesError(s"Failed get voucher: $error")))
      } yield Ok(result)).merge.flatten
    }

    HttpRoutes.of[F] {
      case _ @GET -> Root / "digital-voucher" / "redemption-history" / subscriptionId =>
        handleRedemptionHistoryRequest(RedemptionHistoryRequestBody(subscriptionId))
      case GET -> Root / "digital-voucher" / subscriptionId =>
        handleGetRequest(subscriptionId)
      case request @ POST -> Root / "digital-voucher" / "replace" =>
        handleReplaceRequest(request)
      case request @ POST -> Root / "digital-voucher" / "cancel" =>
        handleCancelRequest(request)
      case request @ PUT -> Root / "digital-voucher" / "suspend" =>
        handleSuspendRequest(request)
      case request @ PUT -> Root / "digital-voucher" / subscriptionId =>
        handleCreateRequest(request, SfSubscriptionId(subscriptionId))
    }
  }
}

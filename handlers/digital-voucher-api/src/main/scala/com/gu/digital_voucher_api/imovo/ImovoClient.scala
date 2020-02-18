package com.gu.digital_voucher_api.imovo

import java.net.URI

import cats.data.EitherT
import cats.effect.Sync
import cats.implicits._
import com.softwaremill.sttp.circe._
import com.softwaremill.sttp._
import com.typesafe.scalalogging.LazyLogging
import io.circe.{Decoder, Encoder}
import io.circe.parser._
import io.circe.generic.auto._

case class ImovoClientError(message: String)

case class ImovoVoucherResponse(voucherCode: String, successfulRequest: Boolean)
case class ImovoErrorResponse(errorMessages: List[String], successfulRequest: Boolean)

trait ImovoClient[F[_]] {
  def replaceVoucher(voucherCode: String): EitherT[F, ImovoClientError, ImovoVoucherResponse]
}

object ImovoClient extends LazyLogging {
  def apply[F[_]: Sync, S](backend: SttpBackend[F, S], baseUrl: String, apiKey: String): EitherT[F, ImovoClientError, ImovoClient[F]] = {
    implicit val b = backend

    def sendAuthenticatedRequest[A: Decoder, B: Encoder](
      apiKey: String,
      method: Method,
      uri: Uri,
      body: Option[B]
    ): EitherT[F, ImovoClientError, A] = {
      val requestWithoutBody = sttp
        .method(method, uri)
        .headers(
          "X-API-KEY" -> apiKey
        )

      val request = body.fold(requestWithoutBody)(b => requestWithoutBody.body(b))

      for {
        response <- EitherT.right[ImovoClientError](request.send())
        responseBody <- EitherT.fromEither[F](decodeResponse[A](request, response))
      } yield responseBody
    }

    def decodeResponse[A: Decoder](
      request: Request[String, S],
      response: Response[String]
    ): Either[ImovoClientError, A] = {
      response
        .body
        .leftMap(
          errorBody =>
            ImovoClientError(
              s"Request ${request.method.m} ${request.uri.toString()} failed returning a status ${response.code} with body: ${errorBody}"
            )
        )
        .flatMap { successBody =>
          for {
            parsedResponse <- parse(successBody)
              .leftMap(e => ImovoClientError(s"Request ${request.method.m} ${request.uri.toString()} failed to parse response ($successBody): $e"))

            successFlag <- parsedResponse
              .hcursor
              .downField("successfulRequest")
              .as[Boolean]
              .leftMap(e => ImovoClientError(s"Request ${request.method.m} ${request.uri.toString()} had a response which did not contain the successfulRequest flag ($successBody): $e"))

            response <- {
              if (successFlag) {
                parsedResponse
                  .as[A]
                  .leftMap(e => ImovoClientError(s"Request ${request.method.m} ${request.uri.toString()} failed to decode response ($successBody): $e"))
              } else {
                ImovoClientError(s"Request ${request.method.m} ${request.uri.toString()} failed with response ($successBody)").asLeft[A]
              }
            }
          } yield response
        }
    }

    new ImovoClient[F] {
      override def replaceVoucher(voucherCode: String): EitherT[F, ImovoClientError, ImovoVoucherResponse] = {
        sendAuthenticatedRequest[ImovoVoucherResponse, String](
          apiKey,
          Method.GET,
          Uri(new URI(s"$baseUrl//Subscription/ReplaceVoucher")).param("VoucherCode", voucherCode),
          None
        )
      }
    }.asRight[ImovoClientError].toEitherT[F]
  }
}

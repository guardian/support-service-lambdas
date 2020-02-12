package com.gu.digital_voucher_api.imovo

import java.net.URI

import cats.Show
import cats.data.EitherT
import cats.effect.Sync
import cats.implicits._
import com.softwaremill.sttp.circe._
import com.softwaremill.sttp._
import com.typesafe.scalalogging.LazyLogging
import io.circe
import io.circe.{Decoder, Encoder}
import io.circe.parser.decode
import io.circe.generic.auto._

case class ImovoClientError(message: String)

case class ImovoVoucherResponse(voucherCode: String, balance: Double, message: String)

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
        .mapResponse(responseBodyString => {
          logger.info(responseBodyString)
          decode[A](responseBodyString)
            .leftMap(e => DeserializationError(responseBodyString, e, Show[circe.Error].show(e)))
        })
      val request = body.fold(requestWithoutBody)(b => requestWithoutBody.body(b))
      sendRequest[A](request)
    }

    def sendRequest[A](
      request: RequestT[Id, Either[DeserializationError[io.circe.Error], A], Nothing]
    ): EitherT[F, ImovoClientError, A] = {
      for {
        response <- EitherT.right[ImovoClientError](request.send())
        responseBody <- EitherT.fromEither[F](formatError[A](request, response))
      } yield responseBody
    }

    def formatError[A](
      request: Request[Either[DeserializationError[circe.Error], A], S],
      response: Response[Either[DeserializationError[circe.Error], A]]
    ): Either[ImovoClientError, A] = {
      response
        .body
        .leftMap(
          errorBody =>
            ImovoClientError(
              s"Request ${request.method.m} ${request.uri.toString()} failed returning a status ${response.code} with body: ${errorBody}"
            )
        )
        .flatMap { parsedBody =>
          parsedBody.leftMap(deserializationError =>
            ImovoClientError(
              s"Request ${request.method.m} ${request.uri.toString()} failed to parse response: $deserializationError"
            ))
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
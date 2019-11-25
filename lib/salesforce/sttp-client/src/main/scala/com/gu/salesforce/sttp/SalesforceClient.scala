package com.gu.salesforce.sttp

import java.net.URI

import cats.Monad
import cats.data.EitherT
import com.gu.salesforce.{RecordsWrapperCaseClass, SFAuthConfig, SalesforceAuth, SalesforceConstants}
import com.softwaremill.sttp.SttpBackend
import com.softwaremill.sttp._
import cats.implicits._
import com.softwaremill.sttp.circe._
import io.circe.Decoder
import io.circe.generic.auto._

trait SalesforceClient[F[_]] {
  def query[A: Decoder](query: String): EitherT[F, SalesforceClientError, RecordsWrapperCaseClass[A]]
}

case class SalesforceClientError(message: String)

object SalesforceClient {
  def apply[F[_]: Monad, S](
    backend: SttpBackend[F, S],
    config: SFAuthConfig
  ): EitherT[F, SalesforceClientError, SalesforceClient[F]] = {
    implicit val b = backend;

    for {
      auth <- auth[S, F](config)
      client = new SalesforceClient[F]() {
        override def query[A: Decoder](query: String): EitherT[F, SalesforceClientError, RecordsWrapperCaseClass[A]] =
          sendRequest[F, S, RecordsWrapperCaseClass[A]](
            sttp
              .get(
                Uri(new URI(auth.instance_url + SalesforceConstants.soqlQueryBaseUrl))
                  .param("q", query)
              )
              .headers(
                "Authorization" -> s"Bearer ${auth.access_token}",
                "X-SFDC-Session" -> auth.access_token,
              )
              .response(asJson[RecordsWrapperCaseClass[A]])
          )
      }
    } yield client
  }

  private def auth[S, F[_]: Monad](config: SFAuthConfig)(implicit backend: SttpBackend[F, S]) = {
    sendRequest[F, S, SalesforceAuth](sttp
      .post(
        Uri(new URI(config.url + "/services/oauth2/token")),
      )
      .body(
        "client_id" -> config.client_id,
        "client_secret" -> config.client_secret,
        "username" -> config.username,
        "password" -> (config.password + config.token),
        "grant_type" -> "password"
      )
      .response(asJson[SalesforceAuth]))
  }

  private def sendRequest[F[_]: Monad, S, A](
    request: RequestT[Id, Either[DeserializationError[io.circe.Error], A], Nothing]
  )(implicit backend: SttpBackend[F, S]): EitherT[F, SalesforceClientError, A] = {
    for {
      response <- EitherT.right[SalesforceClientError](request.send())
      responseBody <- EitherT.fromEither[F](formatError(response))
    } yield responseBody
  }

  private def formatError[A](response: Response[Either[DeserializationError[io.circe.Error], A]]): Either[SalesforceClientError, A] = {
    response
      .body
      .leftMap(
        errorBody =>
          SalesforceClientError(
            s"Request failed returning a status ${response.code} with body: ${errorBody}"
          )
      )
      .right.flatMap { parsedBody =>
        parsedBody.leftMap(deserializationError =>
          SalesforceClientError(
            s"Request to parse response: $deserializationError"
          )
        )
      }
  }
}

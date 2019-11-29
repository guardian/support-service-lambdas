package com.gu.salesforce.sttp

import java.net.URI

import cats.Monad
import cats.data.EitherT
import com.gu.salesforce.{RecordsWrapperCaseClass, SFAuthConfig, SalesforceAuth, SalesforceConstants}
import com.softwaremill.sttp.SttpBackend
import com.softwaremill.sttp._
import cats.implicits._
import com.softwaremill.sttp.circe._
import io.circe
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
        override def query[A: Decoder](query: String): EitherT[F, SalesforceClientError, RecordsWrapperCaseClass[A]] = {
          val initialQueryUri = Uri(new URI(auth.instance_url + SalesforceConstants.soqlQueryBaseUrl)).param("q", query)
          for {
            initalQueryResults <- sendRequest[F, S, A](auth, Method.GET, initialQueryUri)
            allResults <- followNextRecordsLinks[F, S, A](auth, initalQueryResults.records, initalQueryResults.nextRecordsUrl)
          } yield allResults
        }
      }
    } yield client
  }

  private def followNextRecordsLinks[F[_] : Monad, S, A: Decoder](auth: SalesforceAuth, records: List[A], optionalNextRecordsLink: Option[String])
  (implicit backend: SttpBackend[F, S]): EitherT[F, SalesforceClientError, RecordsWrapperCaseClass[A]] = {
    optionalNextRecordsLink match {
      case Some(nextRecordsLinks) =>
        for {
          nextPageResults <- sendRequest[F, S, A](auth, Method.GET, Uri(new URI(auth.instance_url + nextRecordsLinks)))
          allRecords <- followNextRecordsLinks[F, S, A](auth, records ++ nextPageResults.records, nextPageResults.nextRecordsUrl)
        } yield allRecords
      case None =>
        EitherT.rightT(RecordsWrapperCaseClass(records))
    }
  }

  private def sendRequest[F[_] : Monad, S, A: Decoder](auth: SalesforceAuth, method: Method, uri: Uri)(implicit backend: SttpBackend[F, S]): EitherT[F, SalesforceClientError, QueryRecordsWrapperCaseClass[A]] = {
    sendRequest[F, S, QueryRecordsWrapperCaseClass[A]](
      sttp
        .method(method, uri)
        .headers(
          "Authorization" -> s"Bearer ${auth.access_token}",
          "X-SFDC-Session" -> auth.access_token,
        )
        .response(asJson[QueryRecordsWrapperCaseClass[A]])
    )
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
      responseBody <- EitherT.fromEither[F](formatError[A, S](request, response))
    } yield responseBody
  }

  private def formatError[A, S](
    request: Request[Either[DeserializationError[circe.Error], A], S],
    response: Response[Either[DeserializationError[circe.Error], A]]
  ): Either[SalesforceClientError, A] = {
    response
      .body
      .leftMap(
        errorBody =>
          SalesforceClientError(
            s"Request ${request.method.m} ${request.uri.toString()} failed returning a status ${response.code} with body: ${errorBody}"
          )
      )
      .flatMap { parsedBody =>
        parsedBody.leftMap(deserializationError =>
          SalesforceClientError(
            s"Request ${request.method.m} ${request.uri.toString()} failed to parse response: $deserializationError"
          )
        )
      }
  }
}

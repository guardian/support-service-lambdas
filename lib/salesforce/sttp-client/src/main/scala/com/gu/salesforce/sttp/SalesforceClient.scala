package com.gu.salesforce.sttp

import java.net.URI

import cats.data.EitherT
import cats.effect.Sync
import com.gu.salesforce.{RecordsWrapperCaseClass, SFAuthConfig, SalesforceAuth, SalesforceConstants}
import com.softwaremill.sttp.SttpBackend
import com.softwaremill.sttp._
import cats.implicits._
import com.softwaremill.sttp.circe._
import com.typesafe.scalalogging.LazyLogging
import io.circe
import io.circe.Decoder
import io.circe.generic.auto._

trait SalesforceClient[F[_]] {
  def query[A: Decoder](query: String): EitherT[F, SalesforceClientError, RecordsWrapperCaseClass[A]]
}

case class SalesforceClientError(message: String)

object SalesforceClient extends LazyLogging {
  def apply[F[_] : Sync, S](
    backend: SttpBackend[F, S],
    config: SFAuthConfig
  ): EitherT[F, SalesforceClientError, SalesforceClient[F]] = {
    implicit val b = backend;

    def auth(config: SFAuthConfig): EitherT[F, SalesforceClientError, SalesforceAuth] = {
      sendRequest[SalesforceAuth](sttp
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

    def followNextRecordsLinks[A: Decoder](
      auth: SalesforceAuth,
      records: List[A],
      optionalNextRecordsLink: Option[String]
    ): EitherT[F, SalesforceClientError, RecordsWrapperCaseClass[A]] = {
      optionalNextRecordsLink match {
        case Some(nextRecordsLinks) =>
          for {
            nextPageResults <- sendAuthenticatedRequest(auth, Method.GET, Uri(new URI(auth.instance_url + nextRecordsLinks)))
            allRecords <- followNextRecordsLinks(auth, records ++ nextPageResults.records, nextPageResults.nextRecordsUrl)
          } yield allRecords
        case None =>
          EitherT.rightT(RecordsWrapperCaseClass(records))
      }
    }

    def sendAuthenticatedRequest[A: Decoder](
      auth: SalesforceAuth,
      method: Method,
      uri: Uri
    ): EitherT[F, SalesforceClientError, QueryRecordsWrapperCaseClass[A]] = {
      sendRequest[QueryRecordsWrapperCaseClass[A]](
        sttp
          .method(method, uri)
          .headers(
            "Authorization" -> s"Bearer ${auth.access_token}",
            "X-SFDC-Session" -> auth.access_token,
          )
          .response(asJson[QueryRecordsWrapperCaseClass[A]])
      )
    }

    def sendRequest[A](
      request: RequestT[Id, Either[DeserializationError[io.circe.Error], A], Nothing]
    ): EitherT[F, SalesforceClientError, A] = {
      for {
        response <- EitherT.right[SalesforceClientError](request.send())
        responseBody <- EitherT.fromEither[F](formatError[A](request, response))
      } yield responseBody
    }

    def formatError[A](
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

    def logQuery(query: String) =
      Sync[F]
        .delay(logger.info(s"Sending query to Salesforce: ${query}"))
        .asRight[SalesforceClientError]
        .toEitherT[F]

    for {
      auth <- auth(config)
      client = new SalesforceClient[F]() {
        override def query[A: Decoder](query: String): EitherT[F, SalesforceClientError, RecordsWrapperCaseClass[A]] = {
          val initialQueryUri = Uri(new URI(auth.instance_url + SalesforceConstants.soqlQueryBaseUrl)).param("q", query)
          for {
            _ <- logQuery(query)
            initialQueryResults <- sendAuthenticatedRequest[A](auth, Method.GET, initialQueryUri)
            allResults <- followNextRecordsLinks[A](
              auth,
              initialQueryResults.records,
              initialQueryResults.nextRecordsUrl
            )
          } yield allResults
        }
      }
    } yield client
  }

}

package com.gu.salesforce.sttp

import java.net.URI

import cats.Show
import cats.data.EitherT
import cats.effect.Sync
import cats.implicits._
import com.gu.salesforce.SalesforceConstants.{sfObjectsBaseUrl, soqlQueryBaseUrl}
import com.gu.salesforce.{RecordsWrapperCaseClass, SFAuthConfig, SalesforceAuth, SalesforceConstants}
import com.softwaremill.sttp.{SttpBackend, _}
import com.softwaremill.sttp.circe._
import com.typesafe.scalalogging.LazyLogging
import io.circe
import io.circe.{Decoder, Encoder}
import io.circe.generic.auto._
import io.circe.parser.decode

trait SalesforceClient[F[_]] {
  def query[A: Decoder](query: String): EitherT[F, SalesforceClientError, RecordsWrapperCaseClass[A]]
  def patch[A: Encoder](objectName: String, objectId: String, body: A): EitherT[F, SalesforceClientError, Unit]
}

case class SalesforceClientError(message: String)

object SalesforceClient extends LazyLogging {
  def apply[F[_] : Sync, S](
    backend: SttpBackend[F, S],
    config: SFAuthConfig
  ): EitherT[F, SalesforceClientError, SalesforceClient[F]] = {
    implicit val b = backend

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
            nextPageResults <- sendAuthenticatedGetRequest(auth, Uri(new URI(auth.instance_url + nextRecordsLinks)))
            allRecords <- followNextRecordsLinks(auth, records ++ nextPageResults.records, nextPageResults.nextRecordsUrl)
          } yield allRecords
        case None =>
          EitherT.rightT(RecordsWrapperCaseClass(records))
      }
    }

    def sendAuthenticatedGetRequest[A: Decoder](
      auth: SalesforceAuth,
      uri: Uri
    ): EitherT[F, SalesforceClientError, QueryRecordsWrapperCaseClass[A]] =
      sendAuthenticatedRequest[QueryRecordsWrapperCaseClass[A], Unit](auth, Method.GET, uri, None)

    def sendAuthenticatedPatchRequest[B: Encoder](
      auth: SalesforceAuth,
      uri: Uri,
      body: B
    ): EitherT[F, SalesforceClientError, Unit] =
      sendAuthenticatedRequest[Unit, B](auth, Method.PATCH, uri, Some(body))

    def sendAuthenticatedRequest[A: Decoder, B: Encoder](
      auth: SalesforceAuth,
      method: Method,
      uri: Uri,
      body: Option[B]
    ): EitherT[F, SalesforceClientError, A] = {
      val requestWithoutBody = sttp
        .method(method, uri)
        .headers(
          "Authorization" -> s"Bearer ${ auth.access_token }",
          "X-SFDC-Session" -> auth.access_token,
        )
        .mapResponse(responseBodyString => {
          logger.info(responseBodyString)
          decode[A](responseBodyString)
            .left.map(e => DeserializationError(responseBodyString, e, Show[circe.Error].show(e)))
        })
      val request = body.fold(requestWithoutBody)(b => requestWithoutBody.body(b))
      sendRequest[A](request)
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
      val body: Either[String, Either[DeserializationError[circe.Error], A]] = response.body
      body
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
          val initialQueryUri = Uri(new URI(auth.instance_url + soqlQueryBaseUrl)).param("q", query)
          for {
            _ <- logQuery(query)
            initialQueryResults <- sendAuthenticatedGetRequest[A](auth, initialQueryUri)
            allResults <- followNextRecordsLinks[A](
              auth,
              initialQueryResults.records,
              initialQueryResults.nextRecordsUrl
            )
          } yield allResults
        }

        override def patch[A: Encoder](objectName: String, objectId: String, body: A): EitherT[F, SalesforceClientError, Unit] = {
          val uri = Uri(new URI(s"${ auth.instance_url }$sfObjectsBaseUrl$objectName/$objectId"))
          for {
            _ <- logQuery(s"$objectName $objectId PATCH with '$body'")
            _ <- sendAuthenticatedPatchRequest(auth, uri, body)
          } yield ()
        }
      }
    } yield client
  }

}

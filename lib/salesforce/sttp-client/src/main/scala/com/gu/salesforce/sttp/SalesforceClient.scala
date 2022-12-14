package com.gu.salesforce.sttp

import cats.data.EitherT
import cats.effect.Sync
import cats.syntax.all._
import com.gu.salesforce.SalesforceConstants.{compositeBaseUrl, sfObjectsBaseUrl, soqlQueryBaseUrl}
import com.gu.salesforce.{RecordsWrapperCaseClass, SFAuthConfig, SalesforceAuth}
import com.typesafe.scalalogging.LazyLogging
import io.circe
import io.circe.generic.auto._
import io.circe.parser._
import io.circe.syntax._
import io.circe._
import sttp.client3._
import sttp.client3.circe._
import sttp.model.{Method, Uri}

import java.net.URI

trait SalesforceClient[F[_]] {
  def query[RESP_BODY: Decoder](query: String): EitherT[F, SalesforceClientError, RecordsWrapperCaseClass[RESP_BODY]]

  def patch[REQ_BODY: Encoder](
      objectName: String,
      objectId: String,
      body: REQ_BODY,
  ): EitherT[F, SalesforceClientError, Unit]

  def composite[PART_BODY: Encoder](
      body: SFApiCompositeRequest[PART_BODY],
  ): EitherT[F, SalesforceClientError, SFApiCompositeResponse]
}

case class SalesforceClientError(message: String)

object SalesforceClient extends LazyLogging {

  private lazy val printer: Printer =
    Printer.noSpaces.copy(dropNullValues = true) // SF doesn't ignore null value fields 😢

  // A Unit decoder decodes everything as a Unit
  private implicit val unitDecoder: Decoder[Unit] = _ => Right(())

  def apply[F[_]: Sync, S](
      backend: SttpBackend[F, S],
      config: SFAuthConfig,
  ): EitherT[F, SalesforceClientError, SalesforceClient[F]] = {

    def auth(config: SFAuthConfig): EitherT[F, SalesforceClientError, SalesforceAuth] = {
      sendRequest[SalesforceAuth](
        basicRequest
          .post(
            Uri(new URI(config.url + "/services/oauth2/token")),
          )
          .body(
            "client_id" -> config.client_id,
            "client_secret" -> config.client_secret,
            "username" -> config.username,
            "password" -> (config.password + config.token),
            "grant_type" -> "password",
          )
          .response(asJson[SalesforceAuth])
          .mapResponse(_.left.map(e => DeserializationException(e.getMessage, DecodingFailure(e.getMessage, Nil)))),
      )
    }

    def followNextRecordsLinks[A: Decoder](
        auth: SalesforceAuth,
        records: List[A],
        optionalNextRecordsLink: Option[String],
    ): EitherT[F, SalesforceClientError, RecordsWrapperCaseClass[A]] = {
      optionalNextRecordsLink match {
        case Some(nextRecordsLinks) =>
          for {
            nextPageResults <- sendAuthenticatedRequest[QueryRecordsWrapperCaseClass[A]](
              auth,
              Method.GET,
              Uri(new URI(auth.instance_url + nextRecordsLinks)),
            )
            allRecords <- followNextRecordsLinks(
              auth,
              records ++ nextPageResults.records,
              nextPageResults.nextRecordsUrl,
            )
          } yield allRecords
        case None =>
          EitherT.rightT(RecordsWrapperCaseClass(records))
      }
    }

    def sendAuthenticatedRequestWithOptionalBody[REQ_BODY: Encoder, RESP_BODY: Decoder](
        auth: SalesforceAuth,
        method: Method,
        uri: Uri,
        body: Option[REQ_BODY],
    ): EitherT[F, SalesforceClientError, RESP_BODY] = {

      /*
       * This is to decode an empty String as a RESP_BODY.
       * Circe treats an empty response body as an error
       * because it's not valid json.
       */
      def decode[RESP_BODY: Decoder](s: String) = {
        val parsed =
          if (s.isEmpty) Right(Json.Null)
          else parse(s)
        parsed.flatMap(_.as[RESP_BODY])
      }

      val requestWithoutBody: Request[Either[DeserializationException[circe.Error], RESP_BODY], Any] =
        basicRequest
          .method(method, uri)
          .headers(
            Map(
              "Authorization" -> s"Bearer ${auth.access_token}",
              "X-SFDC-Session" -> auth.access_token,
              "Content-Type" -> "application/json",
            ),
          )
          .mapResponse {
            case Left(failure) =>
              logger.info(failure)
              decode[RESP_BODY](failure).left.map(e => DeserializationException(e.getMessage, e))

            case Right(success) =>
              logger.info(success)
              val errorOrRespbody: Either[circe.Error, RESP_BODY] = decode[RESP_BODY](success)
              errorOrRespbody.left.map(e => DeserializationException(e.getMessage, e))
          }

      val bodyAsStringNoNulls = printer.print(body.asJson)

      sendRequest[RESP_BODY](
        body.fold(requestWithoutBody)(_ => requestWithoutBody.body(bodyAsStringNoNulls)),
      )
    }

    def sendAuthenticatedRequest[RESP_BODY: Decoder](
        auth: SalesforceAuth,
        method: Method,
        uri: Uri,
    ): EitherT[F, SalesforceClientError, RESP_BODY] = sendAuthenticatedRequestWithOptionalBody[Unit, RESP_BODY](
      auth,
      method,
      uri,
      body = None,
    )

    def sendRequest[A](
        request: Request[Either[DeserializationException[circe.Error], A], Any],
    ): EitherT[F, SalesforceClientError, A] = {
      for {
        response <- EitherT.right[SalesforceClientError](request.send(backend))
        responseBody <- EitherT.fromEither[F](formatError[A](request, response))
      } yield responseBody
    }

    def formatError[A](
        request: Request[Either[DeserializationException[circe.Error], A], S],
        response: Response[Either[DeserializationException[circe.Error], A]],
    ): Either[SalesforceClientError, A] = {
      response.body.left.map(errorBody =>
        SalesforceClientError(
          s"Request ${request.method.method} ${request.uri.toString()} failed returning a status ${response.code} with body: ${errorBody}",
        ),
      )
    }

    def logQuery(query: String) =
      Sync[F]
        .delay(logger.info(s"Sending query to Salesforce: ${query}"))
        .asRight[SalesforceClientError]
        .toEitherT[F]

    for {
      auth <- auth(config)
      client = new SalesforceClient[F]() {

        override def query[A: Decoder](
            query: String,
        ): EitherT[F, SalesforceClientError, RecordsWrapperCaseClass[A]] = {
          val initialQueryUri = Uri(new URI(auth.instance_url + soqlQueryBaseUrl)).addParam("q", query)
          for {
            _ <- logQuery(query)
            initialQueryResults <- sendAuthenticatedRequest[QueryRecordsWrapperCaseClass[A]](
              auth,
              Method.GET,
              initialQueryUri,
            )
            allResults <- followNextRecordsLinks[A](
              auth,
              initialQueryResults.records,
              initialQueryResults.nextRecordsUrl,
            )
          } yield allResults
        }

        override def patch[REQ_BODY: Encoder](
            objectName: String,
            objectId: String,
            body: REQ_BODY,
        ): EitherT[F, SalesforceClientError, Unit] = {
          val uri = Uri(new URI(s"${auth.instance_url}$sfObjectsBaseUrl$objectName/$objectId"))
          for {
            _ <- logQuery(s"$objectName $objectId PATCH with '$body'")
            _ <- sendAuthenticatedRequestWithOptionalBody[REQ_BODY, Unit](auth, Method.PATCH, uri, Some(body))
          } yield ()
        }

        private lazy val successStatusCodes = 200 to 299

        override def composite[PART_BODY: Encoder](
            body: SFApiCompositeRequest[PART_BODY],
        ): EitherT[F, SalesforceClientError, SFApiCompositeResponse] = {
          sendAuthenticatedRequestWithOptionalBody[SFApiCompositeRequest[PART_BODY], SFApiCompositeResponse](
            auth,
            Method.POST,
            Uri(new URI(auth.instance_url + compositeBaseUrl)),
            Some(body),
          ).flatMap(response =>
            // this is necessary because for some bizarre reason composite requests return a 200 even if the sub-requests fail
            // see https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/requests_composite.htm
            response.compositeResponse
              .filterNot(part => successStatusCodes.contains(part.httpStatusCode))
              .toNel
              .fold(
                response.asRight[SalesforceClientError], // no inner failures so return response
              )(failureCodes =>
                SalesforceClientError(
                  failureCodes
                    .map(part => s"${part.httpStatusCode} (${part.referenceId})")
                    .mkString_("Composite Failure Status Codes : ", ", ", ""),
                ).asLeft[SFApiCompositeResponse],
              )
              .toEitherT[F],
          )
        }
      }
    } yield client
  }

}

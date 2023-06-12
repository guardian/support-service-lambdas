package com.gu.productmove.salesforce

import sttp.client3.quick.basicRequest
import com.gu.productmove.{AwsS3, Secrets}
import com.gu.productmove.GuReaderRevenuePrivateS3.{bucket, key}
import com.gu.productmove.GuStageLive.Stage
import com.gu.productmove.Util.getFromEnv
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ErrorResponse, InternalServerError}
import sttp.capabilities.zio.ZioStreams
import sttp.capabilities.{Effect, WebSockets}
import sttp.client3.*
import sttp.client3.httpclient.zio.HttpClientZioBackend
import sttp.client3.ziojson.*
import sttp.model.Uri
import zio.json.*
import zio.{IO, RIO, Task, ZIO, ZLayer}

import java.time.LocalDate
import scala.concurrent.duration.{Duration, SECONDS}

case class SalesforceConfig(
    stage: String,
    url: String,
    client_id: String,
    client_secret: String,
    username: String,
    password: String,
    token: String,
)

given JsonDecoder[SalesforceConfig] = DeriveJsonDecoder.gen[SalesforceConfig]

case class SalesforceAuthDetails(access_token: String, instance_url: String)

given JsonDecoder[SalesforceAuthDetails] = DeriveJsonDecoder.gen[SalesforceAuthDetails]

trait SalesforceClient {
  def get[Response: JsonDecoder](relativeUrl: Uri): IO[ErrorResponse, Response]
  def post[Request: JsonEncoder, Response: JsonDecoder](input: Request, relativeUrl: Uri): IO[ErrorResponse, Response]
}

object SalesforceClient {
  def get[Response: JsonDecoder](relativeUrl: Uri): ZIO[SalesforceClient, ErrorResponse, Response] =
    ZIO.environmentWithZIO(_.get.get(relativeUrl))
  def post[Request: JsonEncoder, Response: JsonDecoder](
      input: Request,
      relativeUrl: Uri,
  ): ZIO[SalesforceClient, ErrorResponse, Response] = ZIO.environmentWithZIO(_.get.post(input, relativeUrl))
}

object SalesforceClientLive {

  val layer: ZLayer[SttpBackend[Task, Any] with Secrets, ErrorResponse, SalesforceClient] =
    ZLayer.fromZIO(
      for {
        secrets <- ZIO.service[Secrets]
        salesforceSSLSecrets <- secrets.getSalesforceSSLSecrets
        url = salesforceSSLSecrets.url
        clientId = salesforceSSLSecrets.client_id
        clientSecret = salesforceSSLSecrets.client_secret
        username = salesforceSSLSecrets.username
        password = salesforceSSLSecrets.password
        token = salesforceSSLSecrets.token

        _ <- ZIO.log("salesforceUrl: " + url)
        _ <- ZIO.log("salesforceUsername: " + username)

        sttpClient <- ZIO.service[SttpBackend[Task, Any]]
        auth <- basicRequest
          .contentType("application/x-www-form-urlencoded")
          .body(
            Map(
              "grant_type" -> "password",
              "client_id" -> clientId,
              "client_secret" -> clientSecret,
              "username" -> username,
              "password" -> s"${password}${token}",
            ),
          )
          .post(uri"${url}/services/oauth2/token")
          .response(asJson[SalesforceAuthDetails])
          .send(sttpClient)
          .map { response =>
            response.body match {
              case Left(err) => println(s"Received an error getting access_token from Salesforce: $err")
              case Right(body) => println(s"Successfully received access_token from Salesforce: $body")
            }
            response.body
          }
          .absolve
          .mapError(e => InternalServerError(e.toString))
        base_uri <- ZIO.fromEither(Uri.parse(auth.instance_url).left.map(e => InternalServerError(e)))

      } yield new SalesforceClient {

        override def get[Response: JsonDecoder](relativeUrl: Uri): IO[ErrorResponse, Response] = {
          val absoluteUri = base_uri.resolve(relativeUrl)

          basicRequest
            .headers(
              Map(
                "Authorization" -> s"Bearer ${auth.access_token}",
              ),
            )
            .get(absoluteUri)
            .response(asJson[Response])
            .send(sttpClient)
            .map { response =>
              response.body match {
                case Left(err) => println(s"Received an error from Salesforce endpoint: $err")
                case Right(body) => println(s"Received a successful response from Salesforce endpoint: $body")
              }
              response.body
            }
            .absolve
            .mapError(e => InternalServerError(e.toString))
        }

        override def post[Request: JsonEncoder, Response: JsonDecoder](
            input: Request,
            relativeUrl: Uri,
        ): ZIO[Any, ErrorResponse, Response] = {
          val absoluteUri = base_uri.resolve(relativeUrl)

          basicRequest
            .contentType("application/json")
            .headers(
              Map(
                "Authorization" -> s"Bearer ${auth.access_token}",
              ),
            )
            .post(absoluteUri)
            .body(input.toJson)
            .response(asJson[Response])
            .send(sttpClient)
            .map { response =>
              response.body match {
                case Left(err) => println(s"Received an error from Salesforce endpoint: $err")
                case Right(body) => println(s"Received a successful response from Salesforce endpoint: $body")
              }
              response.body
            }
            .absolve
            .mapError(e => InternalServerError(e.toString))
        }
      },
    )
}

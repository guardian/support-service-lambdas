package com.gu.http4s

import java.io.{InputStream, OutputStream}

import cats.data.EitherT
import cats.effect.IO
import org.http4s.{EmptyBody, Header, Headers, HttpRoutes, Method, Query, Request, Response, Uri}
import io.circe.parser._
import io.circe.generic.auto._
import io.circe.syntax._
import cats.syntax.all._
import fs2.{Stream, text}

import scala.collection.immutable
import scala.io.Source
import org.typelevel.ci._

case class LambdaRequest(
  httpMethod: String,
  path: String,
  multiValueQueryStringParameters: Option[Map[String, List[String]]],
  body: Option[String],
  multiValueHeaders: Option[Map[String, List[String]]]
)

case class LambdaResponse(
  statusCode: Int,
  body: String,
  headers: Map[String, String]
)

class Http4sLambdaHandler(service: HttpRoutes[IO]) {
  def handle(inputStream: InputStream, outputStream: OutputStream): Unit = {
    val responseIo = for {
      request <- parseRequest(inputStream).toEitherT[IO]
      http4sResponse <- runRequest(request, service)
      response <- convertToHttp4sResponse(http4sResponse)
    } yield response

    val response = Either
      .catchNonFatal(responseIo.value.unsafeRunSync())
      .leftMap(ex => s"Unexpected Exception: $ex")
      .flatMap(identity)
      .fold(
        error => LambdaResponse(500, error, Map.empty),
        identity
      )

    try {
      outputStream.write(
        response.asJson.spaces2.getBytes("UTF-8")
      )
    } finally {
      outputStream.close();
    }
  }

  private def parseRequest(inputStream: InputStream): Either[String, Request[IO]] = {
    for {
      apiGatewayRequestString <- Either
        .catchNonFatal(Source.fromInputStream(inputStream).mkString)
        .leftMap(ex => s"Failed to stream lambda input stream: $ex")
      apiGateWayRequest <- decode[LambdaRequest](apiGatewayRequestString)
        .leftMap(circeError => s"Failed to parse api gateway request: $circeError")
      http4sRequest <- convertToHttp4sRequest(apiGateWayRequest)
    } yield http4sRequest
  }

  private def runRequest(http4sRequest: Request[IO], http4sService: HttpRoutes[IO]) = {
    EitherT(
      Either.catchNonFatal {
        http4sService
          .run(http4sRequest)
          .getOrElse(Response.notFound)
      }
        .leftMap(ex => s"Unexpected exception: $ex")
        .traverse(identity)
    )
  }

  private def convertToHttp4sResponse(http4sResponse: Response[IO]): EitherT[IO, String, LambdaResponse] = {
    for {
      responseBody <- http4sResponse
        .attemptAs[String]
        .leftMap(decodingFailure => s"Failed to convert response body to string: ${decodingFailure}")
      headers = http4sResponse.headers.iterator.map { header => (header.name.toString(), header.value) }.toMap
    } yield LambdaResponse(http4sResponse.status.code, responseBody, headers)
  }

  private def convertToHttp4sRequest(apiGateWayRequest: LambdaRequest) = {
    for {
      method <- Method.fromString(apiGateWayRequest.httpMethod).leftMap(_.toString)
      uri = extractUri(apiGateWayRequest)
      headers = extractHeaders(apiGateWayRequest)
      body = extractBody(apiGateWayRequest)
    } yield Request[IO](
      method = method,
      uri = uri,
      headers = headers,
      body = body
    )
  }

  private def extractUri(apiGateWayRequest: LambdaRequest): Uri = {
    val queryStringValues: immutable.Seq[(String, Option[String])] =
      apiGateWayRequest
        .multiValueQueryStringParameters.getOrElse(Nil)
        .flatMap {
          case (key, valueList) => valueList.map(value => key -> Some(value).filter(!_.isEmpty))
        }.toList

    Uri(path = apiGateWayRequest.path, query = Query(queryStringValues: _*))
  }

  private def extractHeaders(apiGateWayRequest: LambdaRequest): Headers = {
    Headers(apiGateWayRequest
        .multiValueHeaders
        .getOrElse(Nil)
        .flatMap { case (key, multiValue) => multiValue.map(value => Header(key, value)) }
        .toList: _*)Header.RawCIString(key)
  }

  private def extractBody(apiGateWayRequest: LambdaRequest) = {
    apiGateWayRequest
      .body
      .map(body => Stream(body).through(text.utf8Encode))
      .getOrElse(EmptyBody)
  }
}

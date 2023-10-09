package com.gu.http4s

import java.io.{ByteArrayInputStream, ByteArrayOutputStream}

import cats.effect.IO
import cats.effect.IO._
import org.http4s._
import org.http4s.dsl.io._
import org.scalatest.Inside
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import org.http4s.syntax.literals._
import org.typelevel.ci._

class Http4sLambdaHandlerTest extends AnyFlatSpec with Matchers {
  "Http4sLambdaHandler" should "handle GET request with no body" in {

    val apiGatewayRequest =
      """{
        |    "path": "/uri/path",
        |    "httpMethod": "GET",
        |    "headers": {
        |        "Header1": "Header Value1",
        |        "Header2": "Header Value2.1"
        |    },
        |    "multiValueHeaders": {
        |        "Header1": [
        |            "Header Value1"
        |        ],
        |        "Header2": [
        |            "Header Value2.1",
        |            "Header Value2.2"
        |        ]
        |    },
        |    "queryStringParameters": {
        |        "Query1": "Query Value1",
        |        "Query2": "Query Value2.1"
        |    },
        |    "multiValueQueryStringParameters": {
        |        "Query1": [
        |            "Query Value1"
        |        ],
        |        "Query2": [
        |            "Query Value2.1",
        |            "Query Value2.2"
        |        ]
        |    },
        |    "body": null
        |}""".stripMargin

    val response = Ok("Response body").map(_.putHeaders(Header.Raw(ci"ResponseHeader", "Response Header Value1")))

    val (decodedRequest: Request[IO], apiGatewayResponse: String) = sendRequest(apiGatewayRequest, response)

    decodedRequest.method should equal(Method.GET)
    decodedRequest.uri should equal(
      Uri(
        path = path"/uri/path",
        query = Query(
          "Query1" -> Some("Query Value1"),
          "Query2" -> Some("Query Value2.1"),
          "Query2" -> Some("Query Value2.2"),
        ),
      ),
    )
    decodedRequest.headers should equal(
      Headers(Header("Header1", "Header Value1"), Header("Header2", "Header Value2.1"), Header("Header2", "Header Value2.2"))Header.Rawci"Header1"Header.Rawci"Header2"Header.Rawci"Header2",
    )
    decodedRequest.httpVersion should equal(HttpVersion.`HTTP/1.1`)
    decodedRequest.body should equal(EmptyBody)

    apiGatewayResponse should equal(
      """{
        |  "statusCode" : 200,
        |  "body" : "Response body",
        |  "headers" : {
        |    "Content-Type" : "text/plain; charset=UTF-8",
        |    "Content-Length" : "13",
        |    "ResponseHeader" : "Response Header Value1"
        |  }
        |}""".stripMargin,
    )
  }
  it should "handle POST request with body" in {

    val apiGatewayRequest =
      """{
        |    "path": "/uri/path",
        |    "httpMethod": "POST",
        |    "headers": {
        |        "Header1": "Header Value1",
        |        "Header2": "Header Value2.1"
        |    },
        |    "multiValueHeaders": {
        |        "Header1": [
        |            "Header Value1"
        |        ],
        |        "Header2": [
        |            "Header Value2.1",
        |            "Header Value2.2"
        |        ]
        |    },
        |    "queryStringParameters": {
        |        "Query1": "Query Value1",
        |        "Query2": "Query Value2.1"
        |    },
        |    "multiValueQueryStringParameters": {
        |        "Query1": [
        |            "Query Value1"
        |        ],
        |        "Query2": [
        |            "Query Value2.1",
        |            "Query Value2.2"
        |        ]
        |    },
        |    "body": "{\"bodyKey\":\"bodyValue\"}"
        |}""".stripMargin

    val response = Ok("Response body").map(_.putHeaders(Header.Raw(ci"ResponseHeader", "Response Header Value1")))

    val (decodedRequest: Request[IO], apiGatewayResponse: String) = sendRequest(apiGatewayRequest, response)

    decodedRequest.method should equal(Method.POST)
    decodedRequest.uri should equal(
      Uri(
        path = path"/uri/path",
        query = Query(
          "Query1" -> Some("Query Value1"),
          "Query2" -> Some("Query Value2.1"),
          "Query2" -> Some("Query Value2.2"),
        ),
      ),
    )
    decodedRequest.headers should equal(
      Headers(Header("Header1", "Header Value1"), Header("Header2", "Header Value2.1"), Header("Header2", "Header Value2.2"))Header.Rawci"Header1"Header.Rawci"Header2"Header.Rawci"Header2",
    )
    decodedRequest.httpVersion should equal(HttpVersion.`HTTP/1.1`)
    new String(decodedRequest.body.compile.toVector.unsafeRunSync().toArray, "UTF-8") should equal(
      "{\"bodyKey\":\"bodyValue\"}",
    )

    apiGatewayResponse should equal(
      """{
        |  "statusCode" : 200,
        |  "body" : "Response body",
        |  "headers" : {
        |    "Content-Type" : "text/plain; charset=UTF-8",
        |    "Content-Length" : "13",
        |    "ResponseHeader" : "Response Header Value1"
        |  }
        |}""".stripMargin,
    )
  }

  def sendRequest(apiGatewayRequest: String, response: IO[Response[IO]]) = {
    var requestReceived: Option[Request[IO]] = None

    val handler = new Http4sLambdaHandler(
      HttpRoutes.of[IO] { case request =>
        requestReceived = Some(request)
        response
      },
    )

    val stream = new ByteArrayOutputStream()

    handler.handle(
      new ByteArrayInputStream(apiGatewayRequest.getBytes("UTF-8")),
      stream,
    )

    val request = Inside.inside(requestReceived) { case Some(request) =>
      request
    }

    val responseBody = new String(stream.toByteArray, "UTF-8")
    (request, responseBody)
  }

}

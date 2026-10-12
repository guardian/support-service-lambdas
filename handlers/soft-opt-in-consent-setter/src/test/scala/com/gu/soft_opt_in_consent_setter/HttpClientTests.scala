package com.gu.soft_opt_in_consent_setter

import com.sun.net.httpserver.HttpServer
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import java.net.InetSocketAddress
import java.nio.charset.StandardCharsets
import java.util.concurrent.atomic.AtomicReference

class HttpClientTests extends AnyFlatSpec with Matchers {
  "HttpClient.patch" should "send a PATCH request on Java 21" in {
    val receivedMethod = new AtomicReference[String]()
    val receivedBody = new AtomicReference[String]()
    val receivedAuthorization = new AtomicReference[String]()
    val server = HttpServer.create(new InetSocketAddress("localhost", 0), 0)
    server.createContext(
      "/consents",
      exchange => {
        receivedMethod.set(exchange.getRequestMethod)
        receivedBody.set(new String(exchange.getRequestBody.readAllBytes(), StandardCharsets.UTF_8))
        receivedAuthorization.set(exchange.getRequestHeaders.getFirst("Authorization"))
        exchange.sendResponseHeaders(204, -1)
        exchange.close()
      },
    )
    server.start()

    try {
      val response = HttpClient.patch(
        s"http://localhost:${server.getAddress.getPort}/consents",
        """{"similar_guardian_products":true}""",
        headers = Seq("Authorization" -> "Bearer token"),
      )

      response shouldBe Right(HttpResponse("", 204))
      receivedMethod.get() shouldBe "PATCH"
      receivedBody.get() shouldBe """{"similar_guardian_products":true}"""
      receivedAuthorization.get() shouldBe "Bearer token"
    } finally server.stop(0)
  }

  "HttpClient.get" should "encode query parameters" in {
    val receivedMethod = new AtomicReference[String]()
    val receivedQuery = new AtomicReference[String]()
    val server = HttpServer.create(new InetSocketAddress("localhost", 0), 0)
    server.createContext(
      "/query",
      exchange => {
        receivedMethod.set(exchange.getRequestMethod)
        receivedQuery.set(exchange.getRequestURI.getQuery)
        val responseBody = "{}".getBytes(StandardCharsets.UTF_8)
        exchange.sendResponseHeaders(200, responseBody.length)
        exchange.getResponseBody.write(responseBody)
        exchange.close()
      },
    )
    server.start()

    try {
      val response = HttpClient.get(
        s"http://localhost:${server.getAddress.getPort}/query",
        queryParameters = Seq("q" -> "SELECT Id FROM Subscription"),
      )

      response shouldBe Right(HttpResponse("{}", 200))
      receivedMethod.get() shouldBe "GET"
      receivedQuery.get() shouldBe "q=SELECT Id FROM Subscription"
    } finally server.stop(0)
  }

  "HttpClient.postForm" should "send form-encoded data" in {
    val receivedMethod = new AtomicReference[String]()
    val receivedBody = new AtomicReference[String]()
    val receivedContentType = new AtomicReference[String]()
    val server = HttpServer.create(new InetSocketAddress("localhost", 0), 0)
    server.createContext(
      "/token",
      exchange => {
        receivedMethod.set(exchange.getRequestMethod)
        receivedBody.set(new String(exchange.getRequestBody.readAllBytes(), StandardCharsets.UTF_8))
        receivedContentType.set(exchange.getRequestHeaders.getFirst("Content-Type"))
        val responseBody = "{}".getBytes(StandardCharsets.UTF_8)
        exchange.sendResponseHeaders(200, responseBody.length)
        exchange.getResponseBody.write(responseBody)
        exchange.close()
      },
    )
    server.start()

    try {
      val response = HttpClient.postForm(
        s"http://localhost:${server.getAddress.getPort}/token",
        Seq("grant_type" -> "password", "username" -> "user@example.com"),
      )

      response shouldBe Right(HttpResponse("{}", 200))
      receivedMethod.get() shouldBe "POST"
      receivedBody.get() shouldBe "grant_type=password&username=user%40example.com"
      receivedContentType.get() should startWith("application/x-www-form-urlencoded")
    } finally server.stop(0)
  }
}

package com.gu.effects

import com.gu.util.Logging
import okhttp3.{OkHttpClient, Request, RequestBody, Response}
import okio.Buffer

import java.nio.charset.StandardCharsets.UTF_8
import java.util.concurrent.TimeUnit
import scala.jdk.CollectionConverters.IterableHasAsScala

object Http extends Logging {

  val response: Request => Response = responseWithTimeout(15)

  def responseWithTimeout(timeout: Int): Request => Response = {
    val restClient = new OkHttpClient()
      .newBuilder()
      .readTimeout(timeout, TimeUnit.SECONDS)
      .build()

    def bodySummary(requestBody: RequestBody) = {
      val buffer = new Buffer()
      requestBody.writeTo(buffer)
      val body = buffer.readString(UTF_8)
      (body.length, body.take(500) + (if (body.length > 500) "..." else ""))
    }

    { request: Request =>
      val maybeBodySummary = Option(request.body).map(bodySummary)
      logger.info(
        s"HTTP request: ${request.method} ${request.url} ${request.headers().asScala.mkString("\n")}" + maybeBodySummary
          .map(summary => s", body:  $summary")
          .getOrElse(""),
      )
      val response = restClient.newCall(request).execute
      logger.info(s"HTTP response: ${response.code}")
      response
    }
  }

  val downloadResponse: Request => Response = {
    val restClient = new OkHttpClient()
      .newBuilder()
      .readTimeout(0, TimeUnit.SECONDS)
      .build()

    { request: Request =>
      logger.info(s"HTTP request: ${request.method} ${request.url} ${request.headers.toMultimap.size}")
      val response = restClient.newCall(request).execute
      logger.info(s"HTTP response: ${response.code}")
      response
    }
  }

}

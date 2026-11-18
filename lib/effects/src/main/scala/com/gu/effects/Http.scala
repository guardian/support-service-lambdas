package com.gu.effects

import com.gu.util.Logging
import okhttp3.{OkHttpClient, Request, Response}

import java.util.concurrent.TimeUnit

object Http extends Logging {

  val response: Request => Response = responseWithTimeout(15)

  def responseWithTimeout(timeout: Int): Request => Response = {
    val restClient = new OkHttpClient()
      .newBuilder()
      .readTimeout(timeout, TimeUnit.SECONDS)
      .build()

    { request: Request =>
      logger.info(requestSummary(request))
      val response = restClient.newCall(request).execute
      logger.info(s"HTTP response: ${response.code}")
      response
    }
  }

  private[effects] def requestSummary(request: Request): String =
    s"HTTP request: ${request.method} ${request.url}"

  def summariseBody(body: String): String =
    (body.length, body.take(500) + (if (body.length > 500) "..." else "")).toString

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

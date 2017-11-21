package com.gu.effects

import java.util.concurrent.TimeUnit

import com.gu.util.Logging
import okhttp3.internal.Util.UTF_8
import okhttp3.{ OkHttpClient, Request, RequestBody, Response }
import okio.Buffer

object Http extends Logging {

  val response: Request => Response = {
    val restClient = new OkHttpClient().newBuilder()
      .readTimeout(15, TimeUnit.SECONDS)
      .build()

    def bodyLength(requestBody: RequestBody) = {
      val buffer = new Buffer()
      requestBody.writeTo(buffer)
      val body = buffer.readString(UTF_8)
      body.length
    }

    { request: Request =>
      val length = Option(request.body).map(bodyLength)
      logger.info(s"HTTP request: ${request.method} ${request.url} ${request.headers.toMultimap.size} headers" + length.map(length => s", body size $length bytes").getOrElse(""))
      val response = restClient.newCall(request).execute
      logger.info(s"HTTP response: ${response.code}")
      response
    }
  }

}

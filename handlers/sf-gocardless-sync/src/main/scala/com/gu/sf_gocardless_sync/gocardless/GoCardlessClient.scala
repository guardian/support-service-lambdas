package com.gu.sf_gocardless_sync.gocardless

import com.gu.util.resthttp.HttpOp
import com.gu.util.resthttp.JsonHttp.StringHttpRequest
import com.gu.util.resthttp.RestRequestMaker.{BodyAsString, toClientFailableOp}
import okhttp3.{Request, Response}

object GoCardlessClient {

  def apply(
      response: Request => Response,
      config: GoCardlessConfig,
  ): HttpOp[StringHttpRequest, BodyAsString] =
    HttpOp(response)
      .flatMap {
        toClientFailableOp
      }
      .setupRequest[StringHttpRequest] {
        withAuthAndHeaders(config)
      }

  def withAuthAndHeaders(config: GoCardlessConfig)(requestInfo: StringHttpRequest): Request =
    requestInfo.requestMethod.builder
      .addHeader("Authorization", s"Bearer ${config.token}")
      .addHeader("GoCardless-Version", "2015-07-06")
      .url(config.url + requestInfo.relativePath.value)
      .build()

}

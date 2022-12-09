package com.gu.identity

import com.gu.util.config.ConfigLocation
import com.gu.util.resthttp.HttpOp
import com.gu.util.resthttp.JsonHttp.StringHttpRequest
import com.gu.util.resthttp.RestRequestMaker.{BodyAsString, toClientFailableOp}
import okhttp3.{HttpUrl, Request, Response}
import play.api.libs.json.{Json, Reads}

object IdentityClient {

  def apply(
      response: Request => Response,
      config: IdentityConfig,
  ): HttpOp[StringHttpRequest, BodyAsString] =
    HttpOp(response)
      .flatMap {
        toClientFailableOp
      }
      .setupRequest[StringHttpRequest] {
        withAuth(config)
      }

  def withAuth(identityConfig: IdentityConfig)(requestInfo: StringHttpRequest): Request = {
    val builder = requestInfo.requestMethod.builder
    val authedBuilder = builder.addHeader("X-GU-ID-Client-Access-Token", s"Bearer ${identityConfig.apiToken}")
    val url = requestInfo.urlParams.value
      .foldLeft(HttpUrl.parse(identityConfig.baseUrl + requestInfo.relativePath.value).newBuilder()) {
        case (nextBuilder, (key, value)) => nextBuilder.addQueryParameter(key, value)
      }
      .build()
    authedBuilder.url(url).build()
  }

}

case class IdentityConfig(
    baseUrl: String,
    apiToken: String,
)

object IdentityConfig {
  implicit val reads: Reads[IdentityConfig] = Json.reads[IdentityConfig]
  implicit val location = ConfigLocation[IdentityConfig](path = "identity", version = 1)
}

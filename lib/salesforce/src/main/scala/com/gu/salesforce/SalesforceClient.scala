package com.gu.salesforce

import com.gu.salesforce.SalesforceAuthenticate.{SFAuthConfig, SalesforceAuth}
import com.gu.util.resthttp.JsonHttp.StringHttpRequest
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.{HttpOp, LazyClientFailableOp}
import okhttp3.{HttpUrl, Request, Response}

object SalesforceClient {

  def apply(
    getResponse: Request => Response,
    config: SFAuthConfig
  ): LazyClientFailableOp[HttpOp[StringHttpRequest, BodyAsString]] =
    SalesforceAuthenticate(getResponse)(config).map { sfAuth =>
      HttpOp(getResponse).flatMap {
        toClientFailableOp
      }.setupRequest[StringHttpRequest] {
        withAuth(sfAuth)
      }
    }

  def withAuth(sfAuth: SalesforceAuth)(requestInfo: StringHttpRequest): Request = {
    val builder = requestInfo.requestMethod.builder
    val authHeaders = List(
      Header(name = "Authorization", value = s"Bearer ${sfAuth.access_token}"),
      Header(name = "X-SFDC-Session", value = sfAuth.access_token)
    )
    val headersWithAuth: List[Header] = requestInfo.headers ++ authHeaders

    val builderWithHeaders = headersWithAuth.foldLeft(builder)((builder: Request.Builder, header: Header) => {
      builder.addHeader(header.name, header.value)
    })

    val url = requestInfo.urlParams.value.foldLeft(HttpUrl.parse(sfAuth.instance_url + requestInfo.relativePath.value).newBuilder()) {
      case (nextBuilder, (key, value)) => nextBuilder.addQueryParameter(key, value)
    }.build()
    builderWithHeaders.url(url).build()
  }
}

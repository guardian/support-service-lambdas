package com.gu.salesforce

import com.gu.salesforce.SalesforceAuthenticate.{SFAuthConfig, SalesforceAuth}
import com.gu.util.resthttp.JsonHttp.StringHttpRequest
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.{HttpOp, LazyClientFailableOp}
import okhttp3.{Request, Response}

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

    val authedBuilder = builder.addHeader("Authorization", s"Bearer ${sfAuth.access_token}")
    val url = sfAuth.instance_url + requestInfo.relativePath.value
    authedBuilder.url(url).build()
  }
}

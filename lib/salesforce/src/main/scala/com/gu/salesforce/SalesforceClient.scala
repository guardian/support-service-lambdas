package com.gu.salesforce

import com.gu.salesforce.JsonHttp.{GetMethod, HttpRequestInfo, PatchMethod, PostMethod}
import SalesforceAuthenticate.{SFAuthConfig, SalesforceAuth}
import com.gu.salesforce
import com.gu.util.resthttp.RestRequestMaker.{BodyAsString, createBodyFromString, toClientFailableOp}
import com.gu.util.resthttp.{HttpOp, LazyClientFailableOp}
import okhttp3.{Request, Response}

object SalesforceClient {

  def apply(
    response: Request => Response,
    config: SFAuthConfig
  ): LazyClientFailableOp[HttpOp[HttpRequestInfo, BodyAsString]] =
    salesforce.SalesforceAuthenticate(response)(config).map { sfAuth =>
      HttpOp(response).flatMap {
        toClientFailableOp
      }.setupRequest[HttpRequestInfo] {
        withAuth(sfAuth)
      }
    }

  def withAuth(sfAuth: SalesforceAuth)(requestInfo: HttpRequestInfo): Request = {
    val builder = requestInfo.requestMethod match {
      case PostMethod(body) => new Request.Builder().post(createBodyFromString(body))
      case PatchMethod(body) => new Request.Builder().patch(createBodyFromString(body))
      case GetMethod => new Request.Builder().get()
    }
    val authedBuilder = builder.addHeader("Authorization", s"Bearer ${sfAuth.access_token}")
    val url = sfAuth.instance_url + requestInfo.relativePath.value
    authedBuilder.url(url).build()
  }

}

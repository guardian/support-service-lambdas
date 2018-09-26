package com.gu.salesforce

import com.gu.salesforce.SalesforceAuthenticate.{SFAuthConfig, SalesforceAuth}
import com.gu.util.resthttp.RestRequestMaker.{BodyAsString, RelativePath, createBodyFromString, toClientFailableOp}
import com.gu.util.resthttp.{HttpOp, LazyClientFailableOp}
import okhttp3.{Request, Response}

object SalesforceClient {

  def apply(
    response: Request => Response,
    config: SFAuthConfig
  ): LazyClientFailableOp[HttpOp[StringHttpRequest, BodyAsString]] =
    SalesforceAuthenticate(response)(config).map { sfAuth =>
      HttpOp(response).flatMap {
        toClientFailableOp
      }.setupRequest[StringHttpRequest] {
        withAuth(sfAuth)
      }
    }

  def withAuth(sfAuth: SalesforceAuth)(requestInfo: StringHttpRequest): Request = {
    val builder = requestInfo.requestMethod.builder
    val authedBuilder = builder.addHeader("Authorization", s"Bearer ${sfAuth.access_token}")
    val url = sfAuth.instance_url + requestInfo.relativePath.value
    authedBuilder.url(url).build()
  }

  sealed trait RequestMethod {
    def builder: Request.Builder
  }
  case class PostMethod(body: BodyAsString) extends RequestMethod {
    override def builder: Request.Builder = new Request.Builder().post(createBodyFromString(body))
  }
  case class PatchMethod(body: BodyAsString) extends RequestMethod {
    override def builder: Request.Builder = new Request.Builder().patch(createBodyFromString(body))
  }
  case object GetMethod extends RequestMethod {
    override def builder: Request.Builder = new Request.Builder().get()
  }

  case class StringHttpRequest(relativePath: RelativePath, requestMethod: RequestMethod)

}

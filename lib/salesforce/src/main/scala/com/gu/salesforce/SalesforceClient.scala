package com.gu.salesforce

import com.gu.salesforce.SalesforceAuthenticate.{SFAuthConfig, SalesforceAuth}
import com.gu.util.resthttp.RestRequestMaker._
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

    val authHeaders = List(
      Header(name = "Authorization", value = s"Bearer ${sfAuth.access_token}"),
      Header(name = "X-SFDC-Session", value = sfAuth.access_token)
    )

    val headersWithAuth: List[Header] = requestInfo.headers ++ authHeaders

    val builderWithHeaders = headersWithAuth.foldLeft(builder)((builder: Request.Builder, header: Header) => {
      builder.addHeader(header.name, header.value)
    })

    val url = sfAuth.instance_url + requestInfo.relativePath.value
    builderWithHeaders.url(url).build()
  }

  sealed trait RequestMethod {
    def builder: Request.Builder
  }
  case class PostMethod(body: BodyAsString, contentType: ContentType = JsonContentType) extends RequestMethod {
    override def builder: Request.Builder = new Request.Builder().post(createBodyFromString(body, contentType))
  }
  case class PatchMethod(body: BodyAsString) extends RequestMethod {
    override def builder: Request.Builder = new Request.Builder().patch(createBodyFromString(body))
  }
  //todo probably will have to add contentType if we ever get salesforce responses as json
  case object GetMethod extends RequestMethod {
    override def builder: Request.Builder = new Request.Builder().get()
  }

  //todo maybe remove default value of header list
  case class StringHttpRequest(relativePath: RelativePath, requestMethod: RequestMethod, headers: List[Header] = List.empty)

}

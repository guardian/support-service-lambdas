package com.gu.salesforce

import com.gu.util.resthttp.JsonHttp.StringHttpRequest
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.HttpOp
import com.typesafe.scalalogging.LazyLogging
import okhttp3.{HttpUrl, Request, Response}
import play.api.libs.json.{Json, Reads}

object SalesforceClient extends LazyLogging {

  def auth(
      getResponse: Request => Response,
      config: SFAuthConfig,
  ): Either[List[SalesforceErrorResponseBody], HttpOp[StringHttpRequest, BodyAsString]] =
    for {
      sfAuth <- SalesforceAuthenticate.auth(getResponse, config)
    } yield HttpOp(getResponse)
      .flatMap(toClientFailableOp)
      .setupRequest[StringHttpRequest] {
        withAuthAndBaseUrl(sfAuth)
      }

  private def getAuthHeaders(accessToken: String): List[Header] = List(
    Header(name = "Authorization", value = s"Bearer $accessToken"),
    Header(name = "X-SFDC-Session", value = accessToken),
  )

  private def withAuthAndBaseUrl(sfAuth: SalesforceAuth)(requestInfo: StringHttpRequest): Request = {
    val builder = requestInfo.requestMethod.builder
    val authHeaders = getAuthHeaders(sfAuth.access_token)
    val headersWithAuth: List[Header] = requestInfo.headers ++ authHeaders

    logger.info(s"SalesforceClient: Final headers for request: ${headersWithAuth.map(h => s"${h.name}: ${h.value}").mkString(", ")}")

    val builderWithHeaders = headersWithAuth.foldLeft(builder)((builder: Request.Builder, header: Header) => {
      builder.addHeader(header.name, header.value)
    })

    val url = requestInfo.urlParams.value
      .foldLeft(HttpUrl.parse(sfAuth.instance_url + requestInfo.relativePath.value).newBuilder()) {
        case (nextBuilder, (key, value)) => nextBuilder.addQueryParameter(key, value)
      }
      .build()
    builderWithHeaders.url(url).build()
  }

  def withAlternateAccessTokenIfPresentInHeaderList(
      headers: Option[Map[String, String]],
  ): StringHttpRequest => StringHttpRequest =
    logger.info(s"withAlternateAccessTokenIfPresentInHeaderList called with headers: $headers")
    withMaybeAlternateAccessToken(headers.flatMap(_.get("X-Ephemeral-Salesforce-Access-Token")))

  def withMaybeAlternateAccessToken(
      maybeAlternateAccessToken: Option[String],
  )(requestInfo: StringHttpRequest): StringHttpRequest =
    maybeAlternateAccessToken
      .map { alternateAccessToken =>
        val nonAuthHeaders = requestInfo.headers.filterNot(header =>
          header.name.equalsIgnoreCase("Authorization") || header.name.equalsIgnoreCase("X-SFDC-Session")
        )
        requestInfo.copy(headers = nonAuthHeaders ++ getAuthHeaders(alternateAccessToken))
      }
      .getOrElse(requestInfo)

  case class SalesforceErrorResponseBody(message: String, errorCode: String) {
    override def toString = s"${errorCode} : ${message}"
  }
  implicit val readsSalesforceErrorResponseBody: Reads[SalesforceErrorResponseBody] =
    Json.reads[SalesforceErrorResponseBody]

}

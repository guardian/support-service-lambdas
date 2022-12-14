package com.gu.salesforce

import com.gu.salesforce.{SFAuthConfig, SalesforceAuth}
import com.gu.util.resthttp.JsonHttp.StringHttpRequest
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.Types._
import com.gu.util.resthttp.{HttpOp, LazyClientFailableOp}
import com.typesafe.scalalogging.LazyLogging
import okhttp3.{HttpUrl, Request, Response}
import play.api.libs.json.Json

object SalesforceClient extends LazyLogging {

  def apply(
      getResponse: Request => Response,
      config: SFAuthConfig,
      shouldExposeSalesforceErrorMessageInClientFailure: Boolean = false,
  ): LazyClientFailableOp[HttpOp[StringHttpRequest, BodyAsString]] =
    SalesforceAuthenticate(getResponse)(config).map { sfAuth: SalesforceAuth =>
      HttpOp(getResponse)
        .flatMap {
          toClientFailableOp(
            shouldExposeSalesforceErrorMessageInClientFailure.toOption(parseSalesforceErrorResponseAsCustomError _),
          )
        }
        .setupRequest[StringHttpRequest] {
          withAuthAndBaseUrl(sfAuth)
        }
    }

  private def getAuthHeaders(accessToken: String): List[Header] = List(
    Header(name = "Authorization", value = s"Bearer $accessToken"),
    Header(name = "X-SFDC-Session", value = accessToken),
  )

  private def withAuthAndBaseUrl(sfAuth: SalesforceAuth)(requestInfo: StringHttpRequest): Request = {
    val builder = requestInfo.requestMethod.builder
    val authHeaders = getAuthHeaders(sfAuth.access_token)
    val headersWithAuth: List[Header] = requestInfo.headers ++ authHeaders

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
    withMaybeAlternateAccessToken(headers.flatMap(_.get("X-Ephemeral-Salesforce-Access-Token")))

  def withMaybeAlternateAccessToken(
      maybeAlternateAccessToken: Option[String],
  )(requestInfo: StringHttpRequest): StringHttpRequest =
    maybeAlternateAccessToken
      .map { alternateAccessToken =>
        requestInfo.copy(headers = requestInfo.headers ++ getAuthHeaders(alternateAccessToken))
      }
      .getOrElse(requestInfo)

  case class SalesforceErrorResponseBody(message: String, errorCode: String) {
    override def toString = s"${errorCode} : ${message}"
  }
  implicit val readsSalesforceErrorResponseBody = Json.reads[SalesforceErrorResponseBody]

  def parseSalesforceErrorResponseAsCustomError(errorBody: String): ClientFailure = try {
    Json.parse(errorBody).as[List[SalesforceErrorResponseBody]] match {
      case singleSfError :: Nil => CustomError(singleSfError.toString)
      case multipleSfErrors =>
        CustomError(
          multipleSfErrors.groupBy(_.errorCode).view.mapValues(_.map(_.message)).mkString.take(500),
        )
      case _ =>
        logger.warn("Salesforce error response didn't contain any detail")
        genericError
    }
  } catch {
    case _: Throwable =>
      logger.warn("Couldn't parse the Salesforce error response body")
      genericError
  }
}

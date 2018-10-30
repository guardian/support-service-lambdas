package com.gu.identity

import com.gu.identityBackfill.Types.EmailAddress
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.salesforce.SalesforceClient.StringHttpRequest
import com.gu.util.resthttp.HttpOp.HttpOpWrapper
import com.gu.util.resthttp.RestRequestMaker._
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import okhttp3.{HttpUrl, Request, Response}
import play.api.libs.json.{JsValue, Json, Reads}

object CreateGuestAccount {

  case class WireGuestRegistrationResponse(
    userId: String
  )
  implicit val reads = Json.reads[WireGuestRegistrationResponse]

  case class WireGuestRegistrationRequest(
    primaryEmailAddress: String //,
  //    privateFields: ,all optional
  //    publicFields: req-displayName only
  )
  implicit val writes = Json.writes[WireGuestRegistrationRequest]

  case class WireIdentityResponse(status: String, guestRegistrationRequest: WireGuestRegistrationResponse)
  implicit val userResponseReads: Reads[WireIdentityResponse] = Json.reads[WireIdentityResponse]

  def toRequest(emailAddress: EmailAddress): PostRequest =
    PostRequest(WireGuestRegistrationRequest(emailAddress.value), RelativePath("/guest"))

  def toResponse(wireGuestRegistrationResponse: WireIdentityResponse): IdentityId =
    IdentityId(wireGuestRegistrationResponse.guestRegistrationRequest.userId)

  val wrapper: HttpOpWrapper[EmailAddress, PostRequest, JsValue, IdentityId] =
    HttpOpWrapper[EmailAddress, PostRequest, JsValue, IdentityId](toRequest, RestRequestMaker.toResult[WireIdentityResponse](_).map(toResponse))

}

object IdentityClient {

  def apply(
    response: Request => Response,
    config: IdentityConfig
  ): HttpOp[StringHttpRequest, BodyAsString] =
    HttpOp(response).flatMap {
      toClientFailableOp
    }.setupRequest[StringHttpRequest] {
      withAuth(config)
    }

  def withAuth(identityConfig: IdentityConfig)(requestInfo: StringHttpRequest): Request = {
    val builder = requestInfo.requestMethod.builder
    val authedBuilder = builder.addHeader("X-GU-ID-Client-Access-Token", s"Bearer ${identityConfig.apiToken}")
    val url = requestInfo.urlParams.value.foldLeft(HttpUrl.parse(identityConfig.baseUrl + requestInfo.relativePath.value).newBuilder()) {
      case (nextBuilder, (key, value)) => nextBuilder.addQueryParameter(key, value)
    }.build()
    authedBuilder.url(url).build()
  }

}

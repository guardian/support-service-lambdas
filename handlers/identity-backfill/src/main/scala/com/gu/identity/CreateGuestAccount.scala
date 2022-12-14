package com.gu.identity

import com.gu.identityBackfill.Types.EmailAddress
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.util.resthttp.HttpOp.HttpOpWrapper
import com.gu.util.resthttp.RestRequestMaker
import com.gu.util.resthttp.RestRequestMaker._
import play.api.libs.json.{JsValue, Json, Reads}

object CreateGuestAccount {

  case class WireGuestRegistrationResponse(userId: String)
  implicit val reads = Json.reads[WireGuestRegistrationResponse]

  case class WireGuestRegistrationRequest(primaryEmailAddress: String)
  implicit val writes = Json.writes[WireGuestRegistrationRequest]

  case class WireIdentityResponse(status: String, guestRegistrationRequest: WireGuestRegistrationResponse)
  implicit val userResponseReads: Reads[WireIdentityResponse] = Json.reads[WireIdentityResponse]

  def toRequest(emailAddress: EmailAddress): PostRequest =
    PostRequest(WireGuestRegistrationRequest(emailAddress.value), RelativePath("/guest"))

  def toResponse(wireGuestRegistrationResponse: WireIdentityResponse): IdentityId =
    IdentityId(wireGuestRegistrationResponse.guestRegistrationRequest.userId)

  val wrapper: HttpOpWrapper[EmailAddress, PostRequest, JsValue, IdentityId] =
    HttpOpWrapper[EmailAddress, PostRequest, JsValue, IdentityId](
      toRequest,
      RestRequestMaker.toResult[WireIdentityResponse](_).map(toResponse),
    )

}

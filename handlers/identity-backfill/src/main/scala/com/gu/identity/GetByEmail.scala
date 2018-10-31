package com.gu.identity

import com.gu.identity.GetByEmail.RawWireModel.{User, UserResponse}
import com.gu.identityBackfill.Types.EmailAddress
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.util.resthttp.HttpOp.HttpOpWrapper
import com.gu.util.resthttp.RestRequestMaker
import com.gu.util.resthttp.RestRequestMaker.{GetRequestWithParams, RelativePath, UrlParams}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import play.api.libs.json.{JsValue, Json, Reads}

object GetByEmail {

  sealed trait IdentityAccount
  case class IdentityAccountWithValidatedEmail(identityId: IdentityId) extends IdentityAccount
  case object IdentityAccountWithUnvalidatedEmail extends IdentityAccount

  object RawWireModel {

    case class StatusFields(userEmailValidated: Boolean)
    implicit val statusFieldsReads: Reads[StatusFields] = Json.reads[StatusFields]

    case class User(id: String, statusFields: StatusFields)
    implicit val userReads: Reads[User] = Json.reads[User]

    case class UserResponse(status: String, user: User)
    implicit val userResponseReads: Reads[UserResponse] = Json.reads[UserResponse]

  }

  val wrapper: HttpOpWrapper[EmailAddress, GetRequestWithParams, JsValue, IdentityAccount] =
    HttpOpWrapper[EmailAddress, GetRequestWithParams, JsValue, IdentityAccount](
      emailAddress => GetRequestWithParams(RelativePath(s"/user"), UrlParams(Map("emailAddress" -> emailAddress.value))),
      RestRequestMaker.toResult[UserResponse](_).flatMap(toResponse)
    )

  def userFromResponse(userResponse: UserResponse): ClientFailableOp[User] =
    userResponse match {
      case UserResponse("ok", user) => ClientSuccess(user)
      case error => GenericError(s"not an OK response from api: $error")
    }

  def toResponse(userResponse: UserResponse): ClientFailableOp[IdentityAccount] = {
    for {
      user <- userFromResponse(userResponse)
      identityId = if (user.statusFields.userEmailValidated) IdentityAccountWithValidatedEmail(IdentityId(user.id)) else IdentityAccountWithUnvalidatedEmail
    } yield identityId

  }

}

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

  sealed trait MaybeValidatedEmail
  case class ValidatedEmail(identityId: IdentityId) extends MaybeValidatedEmail
  case object NotValidated extends MaybeValidatedEmail

  object RawWireModel {

    case class StatusFields(userEmailValidated: Boolean)
    implicit val statusFieldsReads: Reads[StatusFields] = Json.reads[StatusFields]

    case class User(id: String, statusFields: StatusFields)
    implicit val userReads: Reads[User] = Json.reads[User]

    case class UserResponse(status: String, user: User)
    implicit val userResponseReads: Reads[UserResponse] = Json.reads[UserResponse]

  }

  val wrapper: HttpOpWrapper[EmailAddress, GetRequestWithParams, JsValue, MaybeValidatedEmail] =
    HttpOpWrapper[EmailAddress, GetRequestWithParams, JsValue, MaybeValidatedEmail](
      emailAddress => GetRequestWithParams(RelativePath(s"/user"), UrlParams(Map("emailAddress" -> emailAddress.value))),
      RestRequestMaker.toResult[UserResponse](_).flatMap(toResponse)
    )

  def userFromResponse(userResponse: UserResponse): ClientFailableOp[User] =
    userResponse match {
      case UserResponse("ok", user) => ClientSuccess(user)
      case _ => GenericError("not an OK response from api")
    }

  def toResponse(userResponse: UserResponse): ClientFailableOp[MaybeValidatedEmail] = {
    for {
      user <- userFromResponse(userResponse)
      identityId = if (user.statusFields.userEmailValidated) ValidatedEmail(IdentityId(user.id)) else NotValidated
    } yield identityId

  }

}

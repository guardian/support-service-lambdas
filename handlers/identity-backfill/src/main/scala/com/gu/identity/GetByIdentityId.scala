package com.gu.identity

import com.gu.identity.GetByIdentityId.RawWireModel.{User, UserResponse}
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.util.resthttp.HttpOp.HttpOpWrapper
import com.gu.util.resthttp.RestRequestMaker
import com.gu.util.resthttp.RestRequestMaker.{GetRequest, RelativePath}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import play.api.libs.json.{JsValue, Json, Reads}

object GetByIdentityId {

  case class IdentityUser(id: IdentityId, hasPassword: Boolean)

  object RawWireModel {

    case class User(id: String, hasPassword: Boolean)
    implicit val userReads: Reads[User] = Json.reads[User]

    case class UserResponse(status: String, user: User)
    implicit val userResponseReads: Reads[UserResponse] = Json.reads[UserResponse]

  }

  val jsToWireModel: JsValue => ClientFailableOp[UserResponse] = RestRequestMaker.toResult[UserResponse]

  def userFromResponse(userResponse: UserResponse): ClientFailableOp[User] =
    userResponse match {
      case UserResponse("ok", user) => ClientSuccess(user)
      case error => GenericError(s"not an OK response from api: $error")
    }

  def wireToDomainModel(userResponse: UserResponse): ClientFailableOp[IdentityUser] = {
    for {
      user <- userFromResponse(userResponse)
    } yield IdentityUser(IdentityId(user.id), user.hasPassword)
  }

  val wrapper: HttpOpWrapper[IdentityId, GetRequest, JsValue, IdentityUser] =
    HttpOpWrapper[IdentityId, GetRequest, JsValue, IdentityUser](
      fromNewParam = id => GetRequest(RelativePath(s"/user/${id.value}")),
      toNewResponse = jsToWireModel.andThen(_.flatMap(wireToDomainModel)),
    )

}

package com.gu.identity

import com.gu.identity.GetByEmail.RawWireModel.{ User, UserResponse }
import okhttp3.{ HttpUrl, Request, Response }
import play.api.libs.json.{ Json, Reads }

import scalaz.{ -\/, \/, \/- }
import scalaz.syntax.std.either._

object GetByEmail {

  case class EmailAddress(value: String)
  case class IdentityId(value: String)

  case class ApiError(message: String)

  object RawWireModel {

    case class User(id: String)
    implicit val userReads: Reads[User] = Json.reads[User]

    case class UserResponse(status: String, user: User)
    implicit val userResponseReads: Reads[UserResponse] = Json.reads[UserResponse]

  }

  object IdentityId {
    def fromUser(user: User) =
      IdentityId(user.id)
  }

  def userFromResponse(userResponse: UserResponse): ApiError \/ User =
    userResponse match {
      case UserResponse("ok", user) => \/-(user)
      case _ => -\/(ApiError("not an OK response from api"))
    }

  def apply(deps: IdentityClientDeps)(email: EmailAddress): ApiError \/ IdentityId = {
    import deps._

    val url = HttpUrl.parse(identityConfig.baseUrl + "/user").newBuilder().addQueryParameter("emailAddress", email.value).build()
    val response = getResponse(new Request.Builder().url(url).addHeader("X-GU-ID-Client-Access-Token", "Bearer " + identityConfig.apiToken).build())

    for {
      _ <- if (response.code == 200) \/-(()) else -\/(ApiError(s"failed http with ${response.code}"))
      body = response.body.byteStream
      userResponse <- Json.parse(body).validate[UserResponse].asEither.disjunction.leftMap(err => ApiError(err.mkString(", ")))
      user <- userFromResponse(userResponse)
      identityId = IdentityId.fromUser(user)
    } yield identityId

  }

}

case class IdentityConfig(
  baseUrl: String,
  apiToken: String)

object IdentityConfig {
  implicit val reads: Reads[IdentityConfig] = Json.reads[IdentityConfig]
}

case class IdentityClientDeps(
  getResponse: Request => Response,
  identityConfig: IdentityConfig)

package com.gu.identity

import com.gu.identity.GetByEmail.RawWireModel.{User, UserResponse}
import com.gu.identityBackfill.Types.{EmailAddress, IdentityId}
import okhttp3.{HttpUrl, Request, Response}
import play.api.libs.json.{Json, Reads}

import scalaz.{-\/, \/, \/-}
import scalaz.syntax.std.either._

object GetByEmail {

  sealed trait ApiError
  case class OtherError(message: String) extends ApiError
  case object NotFound extends ApiError

  object RawWireModel {

    case class User(id: String)
    implicit val userReads: Reads[User] = Json.reads[User]

    case class UserResponse(status: String, user: User)
    implicit val userResponseReads: Reads[UserResponse] = Json.reads[UserResponse]

  }

  def identityIdFromUser(user: User) =
    IdentityId(user.id)

  def userFromResponse(userResponse: UserResponse): ApiError \/ User =
    userResponse match {
      case UserResponse("ok", user) => \/-(user)
      case _ => -\/(OtherError("not an OK response from api"))
    }

  def apply(getResponse: Request => Response, identityConfig: IdentityConfig)(email: EmailAddress): ApiError \/ IdentityId = {

    val url = HttpUrl.parse(identityConfig.baseUrl + "/user").newBuilder().addQueryParameter("emailAddress", email.value).build()
    val response = getResponse(new Request.Builder().url(url).addHeader("X-GU-ID-Client-Access-Token", "Bearer " + identityConfig.apiToken).build())

    for {
      _ <- response.code match {
        case 200 => \/-(())
        case 404 => -\/(NotFound)
        case code => -\/(OtherError(s"failed http with ${code}"))
      }
      body = response.body.byteStream
      userResponse <- Json.parse(body).validate[UserResponse].asEither.disjunction.leftMap(err => OtherError(err.mkString(", ")))
      user <- userFromResponse(userResponse)
      identityId = identityIdFromUser(user)
    } yield identityId

  }

}

case class IdentityConfig(
  baseUrl: String,
  apiToken: String
)

object IdentityConfig {
  implicit val reads: Reads[IdentityConfig] = Json.reads[IdentityConfig]
}

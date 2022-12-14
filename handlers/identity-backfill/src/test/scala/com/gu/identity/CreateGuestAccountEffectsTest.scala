package com.gu.identity

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.identityBackfill.Types.EmailAddress
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.HttpOp.HttpOpWrapper
import com.gu.util.resthttp.{JsonHttp, RestRequestMaker}
import com.gu.util.resthttp.RestRequestMaker.{GetRequestWithParams, RelativePath, UrlParams}
import play.api.libs.json.{JsValue, Json, Reads}

import scala.util.Random
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class CreateGuestAccountEffectsTest extends AnyFlatSpec with Matchers {

  it should "create a guest account" taggedAs EffectsTest in {

    val unique = s"${Random.nextLong.toHexString}"
    val testContact = EmailAddress(s"sx.CreateGuestAccountEffectsTest+$unique@gu.com")

    val actual = for {
      identityConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[IdentityConfig]
      response = RawEffects.response
      identityClient = IdentityClient(response, identityConfig)
      createGuestAccount = identityClient.wrapWith(JsonHttp.post).wrapWith(CreateGuestAccount.wrapper)
      createdId <- createGuestAccount.runRequest(testContact).toDisjunction
      fetchedId <- identityClient
        .wrapWith(JsonHttp.getWithParams)
        .wrapWith(GetByEmailForTesting.wrapper)
        .runRequest(testContact)
        .toDisjunction
    } yield (createdId, fetchedId)

    val failure = actual.map {
      case (createdId, fetchedId) if createdId == fetchedId =>
        None
      case (createdId, fetchedId) =>
        Some(
          s"for email $testContact createdId by email address was $createdId but afterwards fetchedId by email address was $fetchedId",
        )
    }
    failure should be(Right(None))

  }

}

object GetByEmailForTesting {

  case class User(id: String)
  implicit val userReads: Reads[User] = Json.reads[User]

  case class UserResponse(user: User)
  implicit val userResponseReads: Reads[UserResponse] = Json.reads[UserResponse]

  val wrapper: HttpOpWrapper[EmailAddress, GetRequestWithParams, JsValue, IdentityId] =
    HttpOpWrapper[EmailAddress, GetRequestWithParams, JsValue, IdentityId](
      emailAddress =>
        GetRequestWithParams(RelativePath(s"/user"), UrlParams(Map("emailAddress" -> emailAddress.value))),
      RestRequestMaker.toResult[UserResponse](_).map((wire: UserResponse) => IdentityId(wire.user.id)),
    )

}

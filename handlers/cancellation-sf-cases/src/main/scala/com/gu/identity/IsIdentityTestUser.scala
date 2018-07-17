package com.gu.identity

import java.time.Duration

import com.gu.identity.IdentityCookieToIdentityUser.IdentityUser
import com.gu.identity.testing.usernames.{Encoder, TestUsernames}
import com.gu.util.config.ConfigLocation
import play.api.libs.json.{Json, Reads}

case class IdentityTestUserConfig(secret: String)
object IdentityTestUserConfig {
  implicit val reads: Reads[IdentityTestUserConfig] = Json.reads[IdentityTestUserConfig]
  implicit val location = ConfigLocation[IdentityTestUserConfig](path = "identityTestUsers", version = 1)
}

object IsIdentityTestUser {

  def apply(identityTestUsersConfig: IdentityTestUserConfig)(identityUser: IdentityUser): Boolean =
    (for {
      displayName <- identityUser.displayName
      firstName <- displayName.split(' ').headOption
      testUsernames = TestUsernames(Encoder.withSecret(identityTestUsersConfig.secret), Duration.ofDays(2))
    } yield testUsernames.isValid(firstName)).getOrElse(false)

}

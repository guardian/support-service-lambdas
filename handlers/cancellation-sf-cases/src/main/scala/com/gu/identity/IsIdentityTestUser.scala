package com.gu.identity

import java.time.Duration

import com.gu.identity.IdentityCookieToIdentityUser.IdentityUser
import com.gu.identity.testing.usernames.{Encoder, TestUsernames}
import com.gu.util.config.{ConfigLocation, LoadConfigModule}
import play.api.libs.json.{Json, Reads}

case class IdentityTestUserConfig(secret: String)

object IsIdentityTestUser {

  implicit val configReads: Reads[IdentityTestUserConfig] = Json.reads[IdentityTestUserConfig]
  implicit val configLocation = ConfigLocation[IdentityTestUserConfig](path = "identityTestUsers", version = 1)

  def apply(loadConfig: LoadConfigModule.PartialApply)(identityUser: IdentityUser): Boolean =
    (for {
      displayName <- identityUser.displayName
      firstName <- displayName.split(' ').headOption
      testUserConfig <- loadConfig[IdentityTestUserConfig].toOption
      testUsernames = TestUsernames(Encoder.withSecret(testUserConfig.secret), Duration.ofDays(2))
    } yield testUsernames.isValid(firstName)).getOrElse(false)

}

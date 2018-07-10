package com.gu.identity

import java.time.Duration

import com.gu.identity.IdentityCookieToIdentityUser.IdentityUser
import com.gu.identity.testing.usernames.{Encoder, TestUsernames}

case class IdentityTestUserConfig(secret: String)

object IsIdentityTestUser {

  def apply(identityTestUsersConfig: IdentityTestUserConfig)(identityUser: IdentityUser): Boolean =
    (for {
      displayName <- identityUser.displayName
      firstName <- displayName.split(' ').headOption
      testUsernames = TestUsernames(Encoder.withSecret(identityTestUsersConfig.secret), Duration.ofDays(2))
    } yield testUsernames.isValid(firstName)).getOrElse(false)

}

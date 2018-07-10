package com.gu.salesforce.auth

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.auth.SalesforceAuthenticate.{SFAuthConfig, SalesforceAuth}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.reader.Types._
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

class SalesforceAuthenticateEffectsTest extends FlatSpec with Matchers {

  it should "get auth SF correctly" taggedAs EffectsTest in {

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[SFAuthConfig].toApiGatewayOp("load config")
      identityId <- SalesforceAuthenticate.doAuth(RawEffects.response, sfConfig)
    } yield {
      identityId
    }
    withClue(s"wrong result: $actual") {
      actual.toDisjunction match {
        case \/-(SalesforceAuth(token, instanceUrl)) =>
          token should not be ("")
          token.length > 20 should be(true)
          instanceUrl should startWith("https://")
        case _ => fail(s"wrong result")
      }
    }
  }

}

package com.gu.salesforce.auth

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate
import com.gu.salesforce.SalesforceReads._
import com.gu.salesforce.{SFAuthConfig, SalesforceAuth}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

class SalesforceAuthenticateEffectsTest extends FlatSpec with Matchers {

  it should "get auth SF correctly" taggedAs EffectsTest in {

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[SFAuthConfig]
      identityId <- SalesforceAuthenticate.apply(RawEffects.response)(sfConfig).value.toDisjunction
    } yield {
      identityId
    }
    withClue(s"wrong result: $actual") {
      actual match {
        case \/-(SalesforceAuth(token, instanceUrl)) =>
          token should not be ("")
          token.length > 20 should be(true)
          instanceUrl should startWith("https://")
        case _ => fail(s"wrong result")
      }
    }
  }

}

package com.gu.identityBackfill.salesforce

import com.gu.effects.{ConfigLoad, RawEffects}
import com.gu.identityBackfill.Handler.StepsConfig
import com.gu.identityBackfill.salesforce.SalesforceAuthenticate.SalesforceAuth
import com.gu.test.EffectsTest
import com.gu.util.{Config, Stage}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-
import scalaz.syntax.std.either._

class SalesforceAuthenticateEffectsTest extends FlatSpec with Matchers {

  it should "get auth SF correctly" taggedAs EffectsTest in {

    val actual = for {
      configAttempt <- ConfigLoad.load(Stage("DEV")).toEither.disjunction
      config <- Config.parseConfig[StepsConfig](configAttempt)
      identityId <- SalesforceAuthenticate.doAuth(RawEffects.createDefault.response, config.stepsConfig.sfConfig)
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

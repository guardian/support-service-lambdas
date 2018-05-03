package com.gu.identity

import com.gu.effects.{ConfigLoad, RawEffects}
import com.gu.identityBackfill.Handler.StepsConfig
import com.gu.identityBackfill.Types.{EmailAddress, IdentityId}
import com.gu.test.EffectsTest
import com.gu.util.{Config, Stage}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-
import scalaz.syntax.std.either._

// run this manually
class GetByEmailEffectsTest extends FlatSpec with Matchers {

  it should "successfull run the health check using the local code against real backend" taggedAs EffectsTest in {

    val actual = for {
      configAttempt <- ConfigLoad.load(Stage("DEV")).toEither.disjunction
      config <- Config.parseConfig[StepsConfig](configAttempt)
      identityId <- GetByEmail(RawEffects.response, config.stepsConfig.identityConfig)(EmailAddress("john.duffell@guardian.co.uk"))
    } yield {
      identityId
    }
    actual should be(\/-(IdentityId("21814163")))

  }

}

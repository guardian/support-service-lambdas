package com.gu.identityBackfill.salesforce.updateSFIdentityId

import com.gu.effects.{ConfigLoad, RawEffects}
import com.gu.identityBackfill.Handler.StepsConfig
import com.gu.identityBackfill.Types.{IdentityId, SFContactId}
import com.gu.identityBackfill.salesforce.{SalesforceAuthenticate, UpdateSalesforceIdentityId}
import com.gu.test.EffectsTest
import com.gu.util.{Config, Stage}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-
import scalaz.syntax.std.either._

import scala.util.Random

class UpdateSalesforceIdentityIdEffectsTest extends FlatSpec with Matchers {

  it should "get auth SF correctly" taggedAs EffectsTest in {

    val unique = s"${Random.nextInt(10000)}"
    val testContact = SFContactId("003g000000LEwO6AAL")

    val getRealResponse = RawEffects.createDefault.response
    val actual = for {
      configAttempt <- ConfigLoad.load(Stage("DEV")).toEither.disjunction
      config <- Config.parseConfig[StepsConfig](configAttempt)
      auth <- SalesforceAuthenticate(getRealResponse, config.stepsConfig.sfConfig)
      authed = UpdateSalesforceIdentityId(getRealResponse)(auth) _
      _ <- authed(testContact, IdentityId(unique))
      identityId <- GetSalesforceIdentityId(getRealResponse)(auth)(testContact)
    } yield identityId

    actual should be(\/-(IdentityId(unique)))

  }

}

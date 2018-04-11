package com.gu.identityBackfill.salesforce.getContact

import com.gu.effects.{ConfigLoad, RawEffects}
import com.gu.identityBackfill.Handler.StepsConfig
import com.gu.identityBackfill.Types.SFContactId
import com.gu.identityBackfill.salesforce.GetSFContactSyncCheckFields.ContactSyncCheckFields
import com.gu.identityBackfill.salesforce.{GetSFContactSyncCheckFields, SalesforceAuthenticate}
import com.gu.test.EffectsTest
import com.gu.util.{Config, Stage}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-
import scalaz.syntax.std.either._

class GetSFContactSyncCheckFieldsEffectsTest extends FlatSpec with Matchers {

  it should "get auth SF correctly" taggedAs EffectsTest in {

    val testContact = SFContactId("003g000000LEwO6AAL")

    val getRealResponse = RawEffects.createDefault.response
    val actual = for {
      configAttempt <- ConfigLoad.load(Stage("DEV")).toEither.disjunction
      config <- Config.parseConfig[StepsConfig](configAttempt)
      auth <- SalesforceAuthenticate(getRealResponse, config.stepsConfig.sfConfig)
      authed = GetSFContactSyncCheckFields(auth) _
      result <- authed(testContact)
    } yield result

    actual should be(\/-(ContactSyncCheckFields(None, "123", "Testing", None)))

  }

}

package com.gu.identityBackfill.salesforce.getContact

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.identityBackfill.TypeConvert._
import com.gu.identityBackfill.salesforce.GetSFContactSyncCheckFields.ContactSyncCheckFields
import com.gu.identityBackfill.salesforce.GetSFContactSyncCheckFields
import com.gu.salesforce.auth.SalesforceAuthenticate
import com.gu.salesforce.auth.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.dev.SFEffectsData
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-
import com.gu.util.reader.Types._

class GetSFContactSyncCheckFieldsEffectsTest extends FlatSpec with Matchers {

  it should "get auth SF correctly" taggedAs EffectsTest in {

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[SFAuthConfig].toApiGatewayOp("parse config")
      sfAuth <- SalesforceAuthenticate.doAuth(RawEffects.response, sfConfig)
      getOp = SalesforceAuthenticate.get(RawEffects.response, sfAuth)
      result <- GetSFContactSyncCheckFields(getOp).apply(SFEffectsData.testContactHasNamePhoneOtherAddress).value.toApiGatewayOp("failed")
    } yield result

    actual.toDisjunction should be(\/-(ContactSyncCheckFields(None, "One", "Day", Some("Afghanistan"))))

  }

}


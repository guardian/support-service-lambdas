package com.gu.identityBackfill.salesforce.getContact

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.identityBackfill.salesforce.GetSFContactSyncCheckFields
import com.gu.identityBackfill.salesforce.GetSFContactSyncCheckFields.ContactSyncCheckFields
import com.gu.salesforce.{JsonHttp, SalesforceClient}
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.dev.SFEffectsData
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

class GetSFContactSyncCheckFieldsEffectsTest extends FlatSpec with Matchers {

  it should "get auth SF correctly" taggedAs EffectsTest in {

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[SFAuthConfig]
      sfAuth <- SalesforceClient(RawEffects.response, sfConfig).value.toDisjunction
      getOp = sfAuth.wrapWith(JsonHttp.get)
      result <- GetSFContactSyncCheckFields(getOp).apply(SFEffectsData.testContactHasNamePhoneOtherAddress).value.toDisjunction
    } yield result

    actual should be(\/-(ContactSyncCheckFields(None, "One", "Day", Some("Afghanistan"))))

  }

}


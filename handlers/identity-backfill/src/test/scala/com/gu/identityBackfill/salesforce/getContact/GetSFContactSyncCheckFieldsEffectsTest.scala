package com.gu.identityBackfill.salesforce.getContact

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.identityBackfill.TypeConvert._
import com.gu.identityBackfill.salesforce.GetSFContactSyncCheckFields.ContactSyncCheckFields
import com.gu.identityBackfill.salesforce.{DevSFEffects, GetSFContactSyncCheckFields}
import com.gu.salesforce.dev.SFEffectsData
import com.gu.test.EffectsTest
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

class GetSFContactSyncCheckFieldsEffectsTest extends FlatSpec with Matchers {

  it should "get auth SF correctly" taggedAs EffectsTest in {

    val actual = for {
      auth <- DevSFEffects(GetFromS3.fetchString, RawEffects.response)
      result <- GetSFContactSyncCheckFields(auth)(SFEffectsData.testContactHasNamePhoneOtherAddress).toApiGatewayOp("failed")
    } yield result

    actual.toDisjunction should be(\/-(ContactSyncCheckFields(None, "One", "Day", None)))

  }

}


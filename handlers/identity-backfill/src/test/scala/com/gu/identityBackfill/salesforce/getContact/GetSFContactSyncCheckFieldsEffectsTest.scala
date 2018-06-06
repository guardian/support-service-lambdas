package com.gu.identityBackfill.salesforce.getContact

import com.gu.effects.RawEffects
import com.gu.identityBackfill.Types.SFContactId
import com.gu.identityBackfill.salesforce.GetSFContactSyncCheckFields.ContactSyncCheckFields
import com.gu.identityBackfill.salesforce.{DevSFEffects, GetSFContactSyncCheckFields}
import com.gu.test.EffectsTest
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

class GetSFContactSyncCheckFieldsEffectsTest extends FlatSpec with Matchers {

  it should "get auth SF correctly" taggedAs EffectsTest in {

    val testContact = SFContactId("003g000000LEwO6AAL")

    val actual = for {
      auth <- DevSFEffects(RawEffects.s3Load, RawEffects.response)
      authed = GetSFContactSyncCheckFields(auth) _
      result <- authed(testContact)
    } yield result

    actual should be(\/-(ContactSyncCheckFields(None, "123", "Testing", None)))

  }

}


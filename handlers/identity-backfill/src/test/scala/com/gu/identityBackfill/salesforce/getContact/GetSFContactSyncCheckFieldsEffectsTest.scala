package com.gu.identityBackfill.salesforce.getContact

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.identityBackfill.Types.SFContactId
import com.gu.identityBackfill.salesforce.GetSFContactSyncCheckFields.ContactSyncCheckFields
import com.gu.identityBackfill.salesforce.{DevSFEffects, GetSFContactSyncCheckFields}
import com.gu.test.EffectsTest
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-
import com.gu.util.reader.Types._

class GetSFContactSyncCheckFieldsEffectsTest extends FlatSpec with Matchers {

  it should "get auth SF correctly" taggedAs EffectsTest in {

    val testContact = SFContactId("003g000000LEwO6AAL")

    val actual = for {
      auth <- DevSFEffects(GetFromS3.fetchString, RawEffects.response)
      result <- GetSFContactSyncCheckFields(auth)(testContact).toDisjunction.toApiGatewayOp("failed")
    } yield result

    actual.toDisjunction should be(\/-(ContactSyncCheckFields(None, "123", "Testing", None)))

  }

}


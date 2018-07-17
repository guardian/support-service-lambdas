package com.gu.identityBackfill.salesforce.updateSFIdentityId

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.identityBackfill.Types.{IdentityId, SFContactId}
import com.gu.identityBackfill.salesforce.{DevSFEffects, UpdateSalesforceIdentityId}
import com.gu.test.EffectsTest
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-
import com.gu.util.reader.Types._

import scala.util.Random

class UpdateSalesforceIdentityIdEffectsTest extends FlatSpec with Matchers {

  it should "get auth SF correctly" taggedAs EffectsTest in {

    val unique = s"${Random.nextInt(10000)}"
    val testContact = SFContactId("0036E00000Ho05i")

    val actual = for {
      auth <- DevSFEffects(GetFromS3.fetchString, RawEffects.response)
      _ <- UpdateSalesforceIdentityId(auth)(testContact, IdentityId(unique)).toDisjunction.toApiGatewayOp("update")
      identityId <- GetSalesforceIdentityId(auth)(testContact)
    } yield identityId

    actual.toDisjunction should be(\/-(IdentityId(unique)))

  }

}

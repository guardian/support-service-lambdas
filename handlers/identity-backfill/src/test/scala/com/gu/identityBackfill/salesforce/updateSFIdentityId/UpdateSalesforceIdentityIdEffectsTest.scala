package com.gu.identityBackfill.salesforce.updateSFIdentityId

import com.gu.effects.RawEffects
import com.gu.identityBackfill.Types.{IdentityId, SFContactId}
import com.gu.identityBackfill.salesforce.{DevSFEffects, UpdateSalesforceIdentityId}
import com.gu.test.EffectsTest
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

import scala.util.Random

class UpdateSalesforceIdentityIdEffectsTest extends FlatSpec with Matchers {

  it should "get auth SF correctly" taggedAs EffectsTest in {

    val unique = s"${Random.nextInt(10000)}"
    val testContact = SFContactId("003g000000LEwO6AAL")

    val actual = for {
      auth <- DevSFEffects(RawEffects.createDefault)
      authed = UpdateSalesforceIdentityId(auth) _
      _ <- authed(testContact, IdentityId(unique))
      identityId <- GetSalesforceIdentityId(auth)(testContact)
    } yield identityId

    actual should be(\/-(IdentityId(unique)))

  }

}

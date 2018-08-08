package com.gu.identityBackfill.salesforce.updateSFIdentityId

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.identityBackfill.salesforce.{HttpOp, UpdateSalesforceIdentityId}
import com.gu.salesforce.auth.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.auth.{SalesforceAuthenticate, SalesforceRestRequestMaker}
import com.gu.salesforce.dev.SFEffectsData
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

import scala.util.Random

class UpdateSalesforceIdentityIdEffectsTest extends FlatSpec with Matchers {

  it should "get auth SF correctly" taggedAs EffectsTest in {

    val unique = s"${Random.nextInt(10000)}"
    val testContact = SFEffectsData.updateIdentityIdContact

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[SFAuthConfig]
      response = RawEffects.response
      auth <- SalesforceAuthenticate.doAuth(response, sfConfig).toDisjunction
      patch = HttpOp(response).prepend(SalesforceRestRequestMaker.patch(auth))
      _ <- UpdateSalesforceIdentityId(patch).run2(testContact, Some(IdentityId(unique))).toDisjunction
      requests = SalesforceRestRequestMaker(auth, response)
      identityId <- GetSalesforceIdentityId(requests)(testContact).toDisjunction
    } yield identityId

    actual should be(\/-(IdentityId(unique)))

  }

}

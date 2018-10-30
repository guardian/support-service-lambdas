package com.gu.identityBackfill.salesforce.updateSFIdentityId

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.salesforce.{JsonHttp, SalesforceClient}
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.dev.SFEffectsData
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

import scala.util.Random

class UpdateSalesforceIdentityIdEffectsTest extends FlatSpec with Matchers {

  it should "get auth SF correctly" taggedAs EffectsTest in {

    val unique = s"${Random.nextInt(10000)}"
    val testContact = SFEffectsData.updateIdentityIdEmailAndFirstNameContact

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[SFAuthConfig]
      response = RawEffects.response
      auth <- SalesforceClient(response, sfConfig).value.toDisjunction
      updateSalesforceIdentityId = UpdateSalesforceIdentityId(auth.wrapWith(JsonHttp.patch))
      _ <- updateSalesforceIdentityId.runRequestMultiArg(testContact, IdentityId(unique)).toDisjunction
      getSalesforceIdentityId = GetSalesforceIdentityId(auth.wrapWith(JsonHttp.get))
      identityId <- getSalesforceIdentityId(testContact).value.toDisjunction
    } yield identityId

    actual should be(\/-(IdentityId(unique)))

  }

}

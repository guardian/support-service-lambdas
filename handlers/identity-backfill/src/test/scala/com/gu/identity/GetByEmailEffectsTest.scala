package com.gu.identity

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.identity.GetByEmail.IdentityAccount
import com.gu.identityBackfill.Types.EmailAddress
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.JsonHttp
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

// run this manually
class GetByEmailEffectsTest extends FlatSpec with Matchers {

  it should "successfull run the health check using the local code against real backend" taggedAs EffectsTest in {

    val actual = for {
      identityConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[IdentityConfig]

      response = RawEffects.response
      identityClient = IdentityClient(response, identityConfig)
      getByEmail = identityClient.wrapWith(JsonHttp.getWithParams).wrapWith(GetByEmail.wrapper)
      identityId <- getByEmail.runRequest(EmailAddress("john.duffell@guardian.co.uk")).toDisjunction
    } yield identityId
    actual should be(\/-(IdentityAccount(IdentityId("21814163"), isUserEmailValidated = true)))

  }

}

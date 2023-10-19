package com.gu.identity

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.identity.GetByIdentityId.IdentityUser
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.JsonHttp
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

// run this manually
class GetByIdentityIdEffectsTest extends AnyFlatSpec with Matchers {

  it should "successfully run the health check using the local code against real backend" taggedAs EffectsTest in {

    val actual = for {
      identityConfig <- LoadConfigModule(Stage("CODE"), GetFromS3.fetchString).load[IdentityConfig]

      response = RawEffects.response
      identityClient = IdentityClient(response, identityConfig)
      getByIdentityId = identityClient.wrapWith(JsonHttp.get).wrapWith(GetByIdentityId.wrapper)
      identityId <- getByIdentityId.runRequest(IdentityId("21814163")).toDisjunction
    } yield identityId
    actual should be(Right(IdentityUser(IdentityId("21814163"), hasPassword = true)))

  }

}

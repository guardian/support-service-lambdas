package com.gu.sf_contact_merge.update.updateSFIdentityId

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.auth.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.auth.{SalesforceAuthenticate, SalesforceRestRequestMaker}
import com.gu.salesforce.dev.SFEffectsData
import com.gu.sf_contact_merge.getaccounts.GetEmails.FirstName
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId.{IdentityId, SFContactUpdate}
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.HttpOp
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

import scala.util.Random

class UpdateSalesforceIdentityIdEffectsTest extends FlatSpec with Matchers {

  it should "get auth SF correctly" taggedAs EffectsTest in {

    val unique = s"${Random.nextInt(10000)}"
    val testContact = SFEffectsData.updateIdentityIdAndFirstNameContact

    val testIdentityId = IdentityId(s"iden$unique")
    val testFirstName = FirstName(s"name$unique")

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[SFAuthConfig]
      response = RawEffects.response
      auth <- SalesforceAuthenticate.doAuth(response, sfConfig).toDisjunction
      updateSalesforceIdentityId = UpdateSalesforceIdentityId(HttpOp(response).setupRequest(SalesforceRestRequestMaker.patch(auth)))
      sFContactUpdate = SFContactUpdate(testIdentityId, Some(testFirstName))
      _ <- updateSalesforceIdentityId.runRequestMultiArg(testContact, Some(sFContactUpdate)).toDisjunction
      getSalesforceIdentityId = GetSalesforceIdentityId(SalesforceRestRequestMaker(auth, response)) _
      updatedIdentityId <- getSalesforceIdentityId(testContact).toDisjunction
    } yield updatedIdentityId

    actual should be(\/-((testIdentityId, testFirstName)))

  }

}

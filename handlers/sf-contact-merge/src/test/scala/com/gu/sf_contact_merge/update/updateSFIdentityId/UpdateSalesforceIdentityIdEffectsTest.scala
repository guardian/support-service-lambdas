package com.gu.sf_contact_merge.update.updateSFIdentityId

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.salesforce.auth.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.auth.{SalesforceAuthenticate, SalesforceRestRequestMaker}
import com.gu.salesforce.dev.SFEffectsData
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.FirstName
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddress.{SFAddress, SFCity, SFCountry, SFPhone, SFPostalCode, SFState, SFStreet}
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId.{IdentityId, SFContactUpdate, SetFirstName}
import com.gu.sf_contact_merge.update.updateSFIdentityId.GetSalesforceIdentityId.WireResult
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.RestRequestMaker.filterIfSuccessful
import com.gu.util.resthttp.{HttpOp, RestRequestMaker}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import org.scalatest.{FlatSpec, Matchers}
import play.api.libs.json.Json
import scalaz.\/-

import scala.util.Random

class UpdateSalesforceIdentityIdEffectsTest extends FlatSpec with Matchers {

  it should "get auth SF correctly" taggedAs EffectsTest in {

    val unique = s"${Random.nextInt(10000)}"
    val testContact = SFEffectsData.updateIdentityIdAndFirstNameContact

    val testIdentityId = IdentityId(s"iden$unique")
    val testFirstName = FirstName(s"name$unique")
    val testAddress = SFAddress(
      SFStreet(s"street$unique"),
      Some(SFCity(s"city$unique")),
      Some(SFState(s"state$unique")),
      Some(SFPostalCode(s"post$unique")),
      SFCountry(s"country$unique"),
      Some(SFPhone(s"phone$unique"))
    )

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[SFAuthConfig]
      response = RawEffects.response
      auth <- SalesforceAuthenticate.doAuth(response, sfConfig).toDisjunction
      patch = HttpOp(response).setupRequest(SalesforceRestRequestMaker.patch(auth)).flatMap(filterIfSuccessful).flatMap(_ => ClientSuccess(()))
      updateSalesforceIdentityId = UpdateSalesforceIdentityId(patch)
      sFContactUpdate = SFContactUpdate(Some(testIdentityId), SetFirstName(testFirstName), Some(testAddress))
      _ <- updateSalesforceIdentityId.apply(testContact, sFContactUpdate).toDisjunction
      getSalesforceIdentityId = GetSalesforceIdentityId(SalesforceRestRequestMaker(auth, response)) _
      updatedIdentityId <- getSalesforceIdentityId(testContact).toDisjunction
    } yield updatedIdentityId

    actual should be(\/-(WireResult(
      testIdentityId.value,
      testFirstName.value,
      s"street$unique",
      s"city$unique",
      s"state$unique",
      s"post$unique",
      s"country$unique",
      s"phone$unique"
    )))

  }

}

object GetSalesforceIdentityId {

  case class WireResult(
    IdentityID__c: String,
    FirstName: String,
    OtherStreet: String, // billing
    OtherCity: String,
    OtherState: String,
    OtherPostalCode: String,
    OtherCountry: String,
    Phone: String
  )

  object WireResult {
    implicit val reads = Json.reads[WireResult]
  }

  def apply(get: RestRequestMaker.Requests)(sFContactId: SFContactId): ClientFailableOp[WireResult] =
    get.get[WireResult](s"/services/data/v43.0/sobjects/Contact/${sFContactId.value}")

}

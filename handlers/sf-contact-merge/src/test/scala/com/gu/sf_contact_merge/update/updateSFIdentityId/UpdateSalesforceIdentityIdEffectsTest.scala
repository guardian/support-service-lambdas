package com.gu.sf_contact_merge.update.updateSFIdentityId

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SFAuthConfig
import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.salesforce.dev.SFEffectsData
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.SalesforceConstants.salesforceApiVersion
import com.gu.salesforce.SalesforceReads._
import com.gu.sf_contact_merge.Types.IdentityId
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.{EmailAddress, FirstName}
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddressOverride.OverrideAddressWith
import com.gu.sf_contact_merge.getsfcontacts.WireContactToSfContact.Types._
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId
import com.gu.sf_contact_merge.update.UpdateSalesforceIdentityId.{SFContactUpdate, SetFirstName}
import com.gu.sf_contact_merge.update.updateSFIdentityId.GetSalesforceIdentityId.WireResult
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.{HttpOp, JsonHttp}
import com.gu.util.resthttp.RestOp.HttpOpParseOp
import com.gu.util.resthttp.RestRequestMaker.{GetRequest, RelativePath}
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.{JsValue, Json}

import scala.util.Random
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class UpdateSalesforceIdentityIdEffectsTest extends AnyFlatSpec with Matchers {

  it should "get auth SF correctly" taggedAs EffectsTest in {

    val unique = s"${Random.nextInt(10000)}"
    val testContact = SFEffectsData.updateIdentityIdEmailAndFirstNameContact

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
    val testEmail = EmailAddress(s"fulfilment.dev+$unique@guardian.co.uk")

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[SFAuthConfig]
      response = RawEffects.response
      sfClient <- SalesforceClient(response, sfConfig).value.toDisjunction
      patch = sfClient.wrapWith(JsonHttp.patch)
      updateSalesforceIdentityId = UpdateSalesforceIdentityId(patch)
      sFContactUpdate = SFContactUpdate(
        Some(testIdentityId),
        SetFirstName(testFirstName),
        OverrideAddressWith(testAddress),
        Some(testEmail)
      )
      _ <- updateSalesforceIdentityId.apply(testContact, sFContactUpdate).toDisjunction
      getSalesforceIdentityId = GetSalesforceIdentityId(sfClient.wrapWith(JsonHttp.get)) _
      updatedIdentityId <- getSalesforceIdentityId(testContact).toDisjunction
    } yield updatedIdentityId

    actual should be(Right(WireResult(
      testIdentityId.value,
      testFirstName.value,
      s"street$unique",
      s"city$unique",
      s"state$unique",
      s"post$unique",
      s"country$unique",
      s"phone$unique",
      s"fulfilment.dev+$unique@guardian.co.uk"
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
    Phone: String,
    Email: String
  )

  object WireResult {
    implicit val reads = Json.reads[WireResult]
  }

  def apply(getOp: HttpOp[GetRequest, JsValue])(sFContactId: SFContactId): ClientFailableOp[WireResult] =
    getOp.setupRequest(toRequest).parse[WireResult].runRequest(sFContactId)

  def toRequest(sfContactId: SFContactId) = GetRequest(RelativePath(s"/services/data/v$salesforceApiVersion/sobjects/Contact/${sfContactId.value}"))

}

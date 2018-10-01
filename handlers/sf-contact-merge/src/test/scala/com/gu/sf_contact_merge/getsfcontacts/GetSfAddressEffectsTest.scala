package com.gu.sf_contact_merge.getsfcontacts

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SalesforceAuthenticate.SFAuthConfig
import com.gu.salesforce.dev.SFEffectsData
import com.gu.salesforce.{JsonHttp, SalesforceClient}
import com.gu.sf_contact_merge.Types.IdentityId
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.EmailAddress
import com.gu.sf_contact_merge.getsfcontacts.ToSfContactRequest.WireResult
import com.gu.sf_contact_merge.getsfcontacts.WireContactToSfContact.Types._
import com.gu.util.resthttp.RestOp._
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import org.scalatest.{FlatSpec, Matchers}
import scalaz.\/-

class GetSfAddressEffectsTest extends FlatSpec with Matchers {

  it should "get a contact" taggedAs EffectsTest in {

    val testContact = SFEffectsData.testContactHasNamePhoneOtherAddress

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("DEV"), GetFromS3.fetchString)[SFAuthConfig]
      response = RawEffects.response
      sfAuth <- SalesforceClient(response, sfConfig).value.toDisjunction
      getSfContact = sfAuth.wrap(JsonHttp.get).setupRequest(ToSfContactRequest.apply).parse[WireResult].map(WireContactToSfContact.apply)
      address <- getSfContact.runRequest(testContact).toDisjunction
    } yield address

    val expected = SFContact(
      UsableContactAddress(SFAddress(
        SFStreet("123 dayone street"),
        Some(SFCity("city1")),
        Some(SFState("state1")),
        Some(SFPostalCode("postal1")),
        SFCountry("Afghanistan"),
        Some(SFPhone("012345"))
      )),
      IsDigitalVoucherUser(false),
      EmailIdentity(EmailAddress("dayone@gu.com"), Some(IdentityId("100000932")))
    )

    actual should be(\/-(expected))

  }

}

package com.gu.sf_contact_merge.getsfcontacts

import com.gu.effects.{GetFromS3, RawEffects}
import com.gu.salesforce.SFAuthConfig
import com.gu.salesforce.dev.SFEffectsData
import com.gu.salesforce.SalesforceClient
import com.gu.salesforce.SalesforceReads._
import com.gu.sf_contact_merge.Types.IdentityId
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.EmailAddress
import com.gu.sf_contact_merge.getsfcontacts.ToSfContactRequest.WireResult
import com.gu.sf_contact_merge.getsfcontacts.WireContactToSfContact.Types._
import com.gu.util.resthttp.RestOp._
import com.gu.test.EffectsTest
import com.gu.util.config.{LoadConfigModule, Stage}
import com.gu.util.resthttp.JsonHttp
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetSfAddressEffectsTest extends AnyFlatSpec with Matchers {

  it should "get a contact" taggedAs EffectsTest in {

    val testContact = SFEffectsData.testContactHasNamePhoneOtherAddress

    val actual = for {
      sfConfig <- LoadConfigModule(Stage("CODE"), GetFromS3.fetchString)[SFAuthConfig]
      response = RawEffects.response
      sfAuth <- SalesforceClient(response, sfConfig).value.toDisjunction
      getSfContact = sfAuth
        .wrapWith(JsonHttp.get)
        .setupRequest(ToSfContactRequest.apply)
        .parse[WireResult]
        .map(WireContactToSfContact.apply)
      address <- getSfContact.runRequest(testContact).toDisjunction
    } yield address

    val expected = SFContact(
      UsableContactAddress(
        SFAddress(
          SFStreet("123 dayone street"),
          Some(SFCity("city1")),
          Some(SFState("state1")),
          Some(SFPostalCode("POSTAL1")),
          SFCountry("Afghanistan"),
          Some(SFPhone("012345")),
        ),
      ),
      IsDigitalVoucherUser(false),
      EmailIdentity(EmailAddress("effecttests@gu.com"), Some(IdentityId("100003915"))),
    )

    actual should be(Right(expected))

  }

}

package com.gu.sf_contact_merge

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.GetFirstNameToUse.NameForContactId
import com.gu.sf_contact_merge.Types.WinningSFContact
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.FirstName
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetFirstNameToUseFirstNameForSFContactTest extends AnyFlatSpec with Matchers {

  it should "abort if the winning contact isn't in any zuora account" in {
    val contactIdsFromZuora = List(NameForContactId(SFContactId("wrong"), None))
    val actual =
      GetFirstNameToUse.firstNameForSFContact(WinningSFContact(SFContactId("winningSfContact")), contactIdsFromZuora)
    actual.toDisjunction.left.map(_.statusCode) should be(Left("404"))
  }

  it should "be happy if the winning contact is in a zuora account" in {
    val someFirstName = Some(FirstName("hi"))
    val contactIdsFromZuora = List(NameForContactId(SFContactId("winningSfContact"), someFirstName))
    val actual =
      GetFirstNameToUse.firstNameForSFContact(WinningSFContact(SFContactId("winningSfContact")), contactIdsFromZuora)
    actual should be(ContinueProcessing(someFirstName))
  }

  it should "skip any non winning contacts in the list" in {
    val someFirstName = Some(FirstName("hi"))
    val contactIdsFromZuora = List(
      NameForContactId(SFContactId("wrong"), None),
      NameForContactId(SFContactId("winningSfContact"), someFirstName),
    )
    val actual =
      GetFirstNameToUse.firstNameForSFContact(WinningSFContact(SFContactId("winningSfContact")), contactIdsFromZuora)
    actual should be(ContinueProcessing(someFirstName))
  }

}

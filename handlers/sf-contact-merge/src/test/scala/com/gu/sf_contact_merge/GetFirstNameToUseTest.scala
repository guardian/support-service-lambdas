package com.gu.sf_contact_merge

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.GetFirstNameToUse.NameForContactId
import com.gu.sf_contact_merge.getaccounts.GetEmails.FirstName
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import org.scalatest.{FlatSpec, Matchers}
import scalaz.-\/

class GetFirstNameToUseFirstNameIfNotTest extends FlatSpec with Matchers {

  it should "firstNameIfNot both present should use winning one" in {

    val actual = GetFirstNameToUse.firstNameIfNot(Some(FirstName("oldname")), Some(FirstName("identityname")))
    actual should be(Some(FirstName("oldname")))

  }

  it should "firstNameIfNot old missing should use identity one" in {

    val actual = GetFirstNameToUse.firstNameIfNot(None, Some(FirstName("identityname")))
    actual should be(Some(FirstName("identityname")))

  }

  it should "firstNameIfNot if no identity or old name return a 404" in {

    val actual = GetFirstNameToUse.firstNameIfNot(None, None)
    actual should be(None)

  }

}
class GetFirstNameToUseFirstNameForSFContactTest extends FlatSpec with Matchers {

  it should "abort if the winning contact isn't in any zuora account" in {
    val contactIdsFromZuora = List(NameForContactId(SFContactId("wrong"), None))
    val actual = GetFirstNameToUse.firstNameForSFContact(SFContactId("winningSfContact"), contactIdsFromZuora)
    actual.toDisjunction.leftMap(_.statusCode) should be(-\/("404"))
  }

  it should "be happy if the winning contact is in a zuora account" in {
    val someFirstName = Some(FirstName("hi"))
    val contactIdsFromZuora = List(NameForContactId(SFContactId("winningSfContact"), someFirstName))
    val actual = GetFirstNameToUse.firstNameForSFContact(SFContactId("winningSfContact"), contactIdsFromZuora)
    actual should be(ContinueProcessing(someFirstName))
  }

}

package com.gu.sf_contact_merge

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.GetSFIdentityIdMoveData.{CanonicalEmail, SFContactIdEmailIdentity}
import com.gu.sf_contact_merge.Types.IdentityId
import com.gu.sf_contact_merge.getaccounts.GetZuoraContactDetails.EmailAddress
import com.gu.sf_contact_merge.getsfcontacts.WireContactToSfContact.Types.EmailIdentity
import com.gu.sf_contact_merge.update.UpdateSFContacts.{IdentityIdMoveData, IdentityIdToUse, OldSFContact}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetSFIdentityIdMoveDataTest extends AnyFlatSpec with Matchers {

  it should "not move identity id if there isn't another account" in {

    val canonicalEmail = CanonicalEmail(EmailAddress("hi@email.com"))
    val contactEmailIdentities: List[SFContactIdEmailIdentity] = List()

    val actual = GetSFIdentityIdMoveData(canonicalEmail, contactEmailIdentities)

    val expected = Right(None)

    actual should be(expected)

  }

  it should "not move identity id if there isn't one on the source object" in {

    val canonicalEmail = CanonicalEmail(EmailAddress("hi@email.com"))
    val contactEmailIdentities: List[SFContactIdEmailIdentity] = List(
      SFContactIdEmailIdentity(SFContactId("con1"), EmailIdentity(canonicalEmail.emailAddress, identityId = None)),
    )

    val actual = GetSFIdentityIdMoveData(canonicalEmail, contactEmailIdentities)

    val expected = Right(None)

    actual should be(expected)

  }

  it should "move identity id if there is one on the source object" in {

    val canonicalEmail = CanonicalEmail(EmailAddress("hi@email.com"))
    val contactEmailIdentities: List[SFContactIdEmailIdentity] = List(
      SFContactIdEmailIdentity(
        SFContactId("con1"),
        EmailIdentity(canonicalEmail.emailAddress, identityId = Some(IdentityId("1234"))),
      ),
    )

    val actual = GetSFIdentityIdMoveData(canonicalEmail, contactEmailIdentities)

    val expected =
      Right(Some(IdentityIdMoveData(OldSFContact(SFContactId("con1")), IdentityIdToUse(IdentityId("1234")))))

    actual should be(expected)

  }

  it should "move identity id if there is one on the source object and one without" in {

    val canonicalEmail = CanonicalEmail(EmailAddress("hi@email.com"))
    val contactEmailIdentities: List[SFContactIdEmailIdentity] = List(
      SFContactIdEmailIdentity(SFContactId("con1"), EmailIdentity(canonicalEmail.emailAddress, identityId = None)),
      SFContactIdEmailIdentity(
        SFContactId("con2"),
        EmailIdentity(canonicalEmail.emailAddress, identityId = Some(IdentityId("1234"))),
      ),
    )

    val actual = GetSFIdentityIdMoveData(canonicalEmail, contactEmailIdentities)

    val expected =
      Right(Some(IdentityIdMoveData(OldSFContact(SFContactId("con2")), IdentityIdToUse(IdentityId("1234")))))

    actual should be(expected)

  }

  it should "move identity id if there is one on the source object and one on another with another email address" in {

    val canonicalEmail = CanonicalEmail(EmailAddress("hi@email.com"))
    val contactEmailIdentities: List[SFContactIdEmailIdentity] = List(
      SFContactIdEmailIdentity(
        SFContactId("con1"),
        EmailIdentity(EmailAddress("hi+gnm9@email.com"), identityId = Some(IdentityId("14"))),
      ),
      SFContactIdEmailIdentity(
        SFContactId("con2"),
        EmailIdentity(canonicalEmail.emailAddress, identityId = Some(IdentityId("1234"))),
      ),
    )

    val actual = GetSFIdentityIdMoveData(canonicalEmail, contactEmailIdentities)

    val expected =
      Right(Some(IdentityIdMoveData(OldSFContact(SFContactId("con2")), IdentityIdToUse(IdentityId("1234")))))

    actual should be(expected)

  }

  it should "fail if there are multiple identity ids with email addresses" in {

    val canonicalEmail = CanonicalEmail(EmailAddress("hi@email.com"))
    val contactEmailIdentities: List[SFContactIdEmailIdentity] = List(
      SFContactIdEmailIdentity(
        SFContactId("con1"),
        EmailIdentity(canonicalEmail.emailAddress, identityId = Some(IdentityId("14"))),
      ),
      SFContactIdEmailIdentity(
        SFContactId("con2"),
        EmailIdentity(canonicalEmail.emailAddress, identityId = Some(IdentityId("1234"))),
      ),
    )

    val actual = GetSFIdentityIdMoveData(canonicalEmail, contactEmailIdentities)

    val expected = Left("there are multiple identity ids")

    actual.left.map(_.split(":")(0)) should be(expected)

  }

}

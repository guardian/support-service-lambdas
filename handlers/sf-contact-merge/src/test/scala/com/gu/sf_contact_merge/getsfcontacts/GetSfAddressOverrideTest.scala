package com.gu.sf_contact_merge.getsfcontacts

import com.gu.sf_contact_merge.getsfcontacts.DedupSfContacts.SFContactsForMerge
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddressOverride.{DontOverrideAddress, OverrideAddressWith}
import com.gu.sf_contact_merge.getsfcontacts.WireContactToSfContact.Types._
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class GetSfAddressOverrideTest extends AnyFlatSpec with Matchers {

  def testAddress(label: String) = SFAddress(
    SFStreet(s"street$label"),
    Some(SFCity("city1")),
    Some(SFState("state1")),
    Some(SFPostalCode("postalcode1")),
    SFCountry("country1"),
    Some(SFPhone("phone1")),
  )

  "GetSfAddressOverride" should "not give an override if it's already set" in {

    val getSfAddressOverride = GetSfAddressOverride.apply

    val actual = getSfAddressOverride.apply(
      SFContactsForMerge(
        ClientSuccess(UsableContactAddress(testAddress("a1"))),
        List(),
      ),
    )

    actual should be(ClientSuccess(DontOverrideAddress))
  }

  "GetSfAddressOverride" should "not give an override if it only has no addresses" in {

    val getSfAddressOverride = GetSfAddressOverride.apply

    val actual = getSfAddressOverride.apply(
      SFContactsForMerge(
        ClientSuccess(UnusableContactAddress),
        List(),
      ),
    )

    actual should be(ClientSuccess(DontOverrideAddress))
  }

  "GetSfAddressOverride" should "give an override if the main contact doesn't have but the other does" in {

    val actual = GetSfAddressOverride.apply(
      SFContactsForMerge(
        ClientSuccess(UnusableContactAddress),
        List(
          ClientSuccess(UsableContactAddress(testAddress("a1"))),
        ),
      ),
    )

    actual should be(ClientSuccess(OverrideAddressWith(testAddress("a1"))))
  }

}

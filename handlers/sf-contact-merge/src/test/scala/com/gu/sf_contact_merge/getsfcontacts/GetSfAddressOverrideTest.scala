package com.gu.sf_contact_merge.getsfcontacts

import com.gu.sf_contact_merge.getsfcontacts.DedupSfContacts.SFContactsForMerge
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddress.SFAddressFields._
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddress.{SFAddress, UnusableContactAddress, UsableContactAddress}
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddressOverride.{DontOverrideAddress, OverrideAddressWith}
import com.gu.util.resthttp.LazyClientFailableOp
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.{FlatSpec, Matchers}

class GetSfAddressOverrideTest extends FlatSpec with Matchers {

  def testAddress(label: String) = SFAddress(
    SFStreet(s"street$label"),
    Some(SFCity("city1")),
    Some(SFState("state1")),
    Some(SFPostalCode("postalcode1")),
    SFCountry("country1"),
    Some(SFPhone("phone1"))
  )

  "GetSfAddressOverride" should "not give an override if it's already set" in {

    val getSfAddressOverride = GetSfAddressOverride.apply

    val actual = getSfAddressOverride.apply(SFContactsForMerge(
      LazyClientFailableOp(() => ClientSuccess(UsableContactAddress(testAddress("a1")))),
      List()
    ))

    actual should be(ClientSuccess(DontOverrideAddress))
  }

  "GetSfAddressOverride" should "not give an override if it only has no addresses" in {

    val getSfAddressOverride = GetSfAddressOverride.apply

    val actual = getSfAddressOverride.apply(SFContactsForMerge(
      LazyClientFailableOp(() => ClientSuccess(UnusableContactAddress)),
      List()
    ))

    actual should be(ClientSuccess(DontOverrideAddress))
  }

  "GetSfAddressOverride" should "give an override if the main contact doesn't have but the other does" in {

    val actual = GetSfAddressOverride.apply(SFContactsForMerge(
      LazyClientFailableOp(() => ClientSuccess(UnusableContactAddress)),
      List(
        LazyClientFailableOp(() => ClientSuccess(UsableContactAddress(testAddress("a1"))))
      )
    ))

    actual should be(ClientSuccess(OverrideAddressWith(testAddress("a1"))))
  }

  "GetSfAddressOverride" should "not carry on checking contacts once one with an address is found" in {

    val actual = GetSfAddressOverride.apply(SFContactsForMerge(
      LazyClientFailableOp(() => ClientSuccess(UnusableContactAddress)),
      List(
        LazyClientFailableOp(() => ClientSuccess(UsableContactAddress(testAddress("a1")))),
        LazyClientFailableOp(() => fail("whoops"))
      )
    ))

    actual should be(ClientSuccess(OverrideAddressWith(testAddress("a1"))))
  }

}

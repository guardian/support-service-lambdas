package com.gu.sf_contact_merge.getsfcontacts

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddress.SFAddressFields._
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddress.{IsDigitalVoucherUser, SFAddress, SFContact, UsableContactAddress}
import com.gu.util.resthttp.LazyClientFailableOp
import com.gu.util.resthttp.Types.ClientSuccess
import org.scalatest.{FlatSpec, Matchers}

class GetSfContactsTest extends FlatSpec with Matchers {

  def testAddress(label: String) = ClientSuccess(SFContact(UsableContactAddress(SFAddress(
    SFStreet(s"street$label"),
    Some(SFCity("city1")),
    Some(SFState("state1")),
    Some(SFPostalCode("postalcode1")),
    SFCountry("country1"),
    Some(SFPhone("phone1"))
  )), IsDigitalVoucherUser(false)))

  final class MockGetSfAddress() {

    var invocationLog = List[String]() // we want to check ordering of side effects...

    def apply(sfContactId: SFContactId): LazyClientFailableOp[SFContact] =
      LazyClientFailableOp { () =>
        invocationLog = invocationLog ++ List(s"get ${sfContactId.value}")
        testAddress(sfContactId.value)
      }

  }

  "getSfContacts" should "get the winner and the other correctly (lazy)" in {

    val invocationLog = new MockGetSfAddress()

    val getSfContacts = GetSfContacts(GetSfAddress(invocationLog.apply _))

    val actual = getSfContacts.apply(SFContactId("a1"), List(SFContactId("a2")))

    invocationLog.invocationLog should be(List())

    actual.winner.value should be(testAddress("a1"))
    actual.others.map(_.value) should be(List(testAddress("a2")))

    val expectedOrder = List("get a1", "get a2")
    invocationLog.invocationLog should be(expectedOrder)

  }

  "getSfContacts" should "remove the main contact from the ones to fetch later" in {

    val invocationLog = new MockGetSfAddress()

    val getSfContacts = GetSfContacts(GetSfAddress(invocationLog.apply _))

    val actual = getSfContacts.apply(SFContactId("a1"), List(SFContactId("a1")))

    invocationLog.invocationLog should be(List())

    actual.winner.value should be(testAddress("a1"))
    actual.others.map(_.value) should be(List())

    val expectedOrder = List("get a1")
    invocationLog.invocationLog should be(expectedOrder)

  }

  "getSfContacts" should "remove duplicates from the list" in {

    val invocationLog = new MockGetSfAddress()

    val getSfContacts = GetSfContacts(GetSfAddress(invocationLog.apply _))

    val actual = getSfContacts.apply(SFContactId("a1"), List(SFContactId("a2"), SFContactId("a2")))

    invocationLog.invocationLog should be(List())

    actual.winner.value should be(testAddress("a1"))
    actual.others.map(_.value) should be(List(testAddress("a2")))

    val expectedOrder = List("get a1", "get a2")
    invocationLog.invocationLog should be(expectedOrder)

  }

}

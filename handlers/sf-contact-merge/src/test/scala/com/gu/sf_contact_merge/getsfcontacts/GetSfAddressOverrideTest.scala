package com.gu.sf_contact_merge.getsfcontacts

import com.gu.sf_contact_merge.getsfcontacts.GetSfAddress.SFAddressFields._
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddress.{SFAddress, SFMaybeAddress, UnusableContactAddress, UsableContactAddress}
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddressOverride.{DontOverrideAddress, OverrideAddressWith}
import com.gu.util.resthttp.LazyClientFailableOp
import com.gu.util.resthttp.Types.{ClientSuccess, GenericError}
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

  final class MockGetSfAddress() {

    var invocationLog = List[String]() // we want to check ordering of side effects...

    def apply(label: String): LazyClientFailableOp[SFMaybeAddress] = {
      val (log, result) = label match {
        case name if name.startsWith("noaddress") =>
          (s"get $label", ClientSuccess(UnusableContactAddress))
        case label if label.startsWith("a") =>
          (s"get $label", ClientSuccess(UsableContactAddress(testAddress(label))))
        case other =>
          (s"other: <$other>", GenericError("whoops"))
      }
      LazyClientFailableOp {
        invocationLog = invocationLog ++ List(log)
        result
      }
    }

  }

  "GetSfAddressOverride" should "not give an override if it's already set" in {

    val invocationLog = new MockGetSfAddress()

    val getSfAddressOverride = GetSfAddressOverride.apply

    val actual = getSfAddressOverride.apply(invocationLog("a1"), List())

    val expectedOrder = List("get a1")
    invocationLog.invocationLog should be(expectedOrder)

    actual should be(ClientSuccess(DontOverrideAddress))
  }

  "GetSfAddressOverride" should "not give an override if it only has no addresses" in {

    val invocationLog = new MockGetSfAddress()

    val getSfAddressOverride = GetSfAddressOverride.apply

    val actual = getSfAddressOverride.apply(invocationLog("noaddress"), List())

    val expectedOrder = List("get noaddress")
    invocationLog.invocationLog should be(expectedOrder)

    actual should be(ClientSuccess(DontOverrideAddress))
  }

  "GetSfAddressOverride" should "give an override if the main contact doesn't have but the other does" in {

    val invocationLog = new MockGetSfAddress()

    val actual = GetSfAddressOverride.apply(invocationLog("noaddress"), List(invocationLog("a1")))

    val expectedOrder = List("get noaddress", "get a1")
    invocationLog.invocationLog should be(expectedOrder)

    actual should be(ClientSuccess(OverrideAddressWith(testAddress("a1"))))
  }

  "GetSfAddressOverride" should "not carry on checking contacts once one with an address is found" in {

    val invocationLog = new MockGetSfAddress()

    val actual = GetSfAddressOverride.apply(invocationLog("noaddress"), List(invocationLog("a1"), invocationLog("noaddress1")))

    val expectedOrder = List("get noaddress", "get a1")
    invocationLog.invocationLog should be(expectedOrder)

    actual should be(ClientSuccess(OverrideAddressWith(testAddress("a1"))))
  }

}

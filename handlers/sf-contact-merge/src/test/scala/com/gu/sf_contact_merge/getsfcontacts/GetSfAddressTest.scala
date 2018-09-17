package com.gu.sf_contact_merge.getsfcontacts

import com.gu.salesforce.TypesForSFEffectsData.SFContactId
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddress.SFAddressFields._
import com.gu.sf_contact_merge.getsfcontacts.GetSfAddress.{SFAddress, WireResult}
import com.gu.util.resthttp.RestRequestMaker.{GetRequest, RelativePath}
import org.scalatest.{FlatSpec, Matchers}

class GetSfAddressTest extends FlatSpec with Matchers {

  "toRequest" should "compose a correct GET request" in {
    val actual = GetSfAddress.toRequest(SFContactId("testcont"))
    actual should be(GetRequest(RelativePath("/services/data/v43.0/sobjects/Contact/testcont")))
  }

  "toResponse" should "return some if all are set" in {
    val wireResult = WireResult(
      OtherStreet = Some("street1"),
      OtherCity = Some("city1"),
      OtherState = Some("state1"),
      OtherPostalCode = Some("postalcode1"),
      OtherCountry = Some("country1"),
      Phone = Some("phone1")
    )
    val actual: Option[SFAddress] = GetSfAddress.toResponse(wireResult)

    val expected = SFAddress(
      SFStreet("street1"),
      Some(SFCity("city1")),
      Some(SFState("state1")),
      Some(SFPostalCode("postalcode1")),
      SFCountry("country1"),
      Some(SFPhone("phone1"))
    )

    actual should be(Some(expected))
  }

  "toResponse" should "return some if only required are set" in {
    val wireResult = WireResult(
      OtherStreet = Some("street1"),
      OtherCity = None,
      OtherState = None,
      OtherPostalCode = None,
      OtherCountry = Some("country1"),
      Phone = None
    )
    val actual: Option[SFAddress] = GetSfAddress.toResponse(wireResult)

    val expected = SFAddress(
      SFStreet("street1"),
      None,
      None,
      None,
      SFCountry("country1"),
      None
    )

    actual should be(Some(expected))
  }

  "toResponse" should "return none if street is a single char" in {
    val wireResult = WireResult(
      OtherStreet = Some(","),
      OtherCity = Some("city1"),
      OtherState = Some("state1"),
      OtherPostalCode = Some("postalcode1"),
      OtherCountry = Some("country1"),
      Phone = Some("phone1")
    )
    val actual: Option[SFAddress] = GetSfAddress.toResponse(wireResult)

    actual should be(None)
  }

  "toResponse" should "return none if street is empty" in {
    val wireResult = WireResult(
      OtherStreet = Some(""),
      OtherCity = Some("city1"),
      OtherState = Some("state1"),
      OtherPostalCode = Some("postalcode1"),
      OtherCountry = Some("country1"),
      Phone = Some("phone1")
    )
    val actual: Option[SFAddress] = GetSfAddress.toResponse(wireResult)

    actual should be(None)
  }

  "toResponse" should "return none if street is missing" in {
    val wireResult = WireResult(
      OtherStreet = None,
      OtherCity = Some("city1"),
      OtherState = Some("state1"),
      OtherPostalCode = Some("postalcode1"),
      OtherCountry = Some("country1"),
      Phone = Some("phone1")
    )
    val actual: Option[SFAddress] = GetSfAddress.toResponse(wireResult)

    actual should be(None)
  }

  "toResponse" should "return none if country is missing" in {
    val wireResult = WireResult(
      OtherStreet = Some(","),
      OtherCity = Some("city1"),
      OtherState = Some("state1"),
      OtherPostalCode = Some("postalcode1"),
      OtherCountry = None,
      Phone = Some("phone1")
    )
    val actual: Option[SFAddress] = GetSfAddress.toResponse(wireResult)

    actual should be(None)
  }

}

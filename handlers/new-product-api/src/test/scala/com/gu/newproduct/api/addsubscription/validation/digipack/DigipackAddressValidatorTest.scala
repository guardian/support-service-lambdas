package com.gu.newproduct.api.addsubscription.validation.digipack

import com.gu.i18n.Country
import com.gu.newproduct.api.addsubscription.email.digipack.{DigipackAddressValidator, ValidatedAddress}
import com.gu.newproduct.api.addsubscription.validation.{Failed, Passed}
import com.gu.newproduct.api.addsubscription.zuora.GetContacts._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class DigipackAddressValidatorTest extends AnyFlatSpec with Matchers {

  val testAddress = BillToAddress(
    Some(Address1("Address1")),
    Some(Address2("Address2")),
    Some(City("City")),
    Some(State("State")),
    Some(Country.UK),
    Some(Postcode("N1 9GU")),
  )

  val validatedAddress = ValidatedAddress(
    Some(Address1("Address1")),
    Some(Address2("Address2")),
    Some(City("City")),
    Some(State("State")),
    Country.UK,
    Some(Postcode("N1 9GU")),
  )

  it should "succeed if all required fields are populated" in {
    DigipackAddressValidator(testAddress) shouldBe Passed(validatedAddress)
  }

  it should "succeed if optional fields are missing" in {
    val noOptionalFieldsAddress =
      testAddress.copy(state = None, address2 = None, address1 = None, city = None, postcode = None)
    val validatedNoOptionalFieldsAddress =
      validatedAddress.copy(state = None, address2 = None, address1 = None, city = None, postcode = None)

    DigipackAddressValidator(noOptionalFieldsAddress) shouldBe Passed(validatedNoOptionalFieldsAddress)
  }

  it should "fail if country is missing" in {
    DigipackAddressValidator(testAddress.copy(country = None)) shouldBe Failed(
      "Billing country must be populated in Zuora",
    )
  }
}

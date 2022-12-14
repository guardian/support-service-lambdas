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
    Address1("Address1"),
    Some(Address2("Address2")),
    City("City"),
    Some(State("State")),
    Country.UK,
    Postcode("N1 9GU"),
  )

  it should "succeed if all required fields are populated" in {
    DigipackAddressValidator(testAddress) shouldBe Passed(validatedAddress)
  }

  it should "succeed if optional fields are missing" in {
    val noOptionalFieldsAddress = testAddress.copy(state = None, address2 = None)
    val validatedNoOptionalFieldsAddress = validatedAddress.copy(state = None, address2 = None)

    DigipackAddressValidator(noOptionalFieldsAddress) shouldBe Passed(validatedNoOptionalFieldsAddress)
  }

  def failedResponse(fieldName: String) = Failed(s"bill to $fieldName must be populated")

  it should "fail if address1 is missing" in {
    DigipackAddressValidator(testAddress.copy(address1 = None)) shouldBe failedResponse("address1")
  }
  it should "fail if address1 is just spaces" in {
    DigipackAddressValidator(testAddress.copy(address1 = Some(Address1("  ")))) shouldBe failedResponse("address1")
  }

  it should "fail if city is missing" in {
    DigipackAddressValidator(testAddress.copy(city = None)) shouldBe failedResponse("city")
  }
  it should "fail if city is just spaces" in {
    DigipackAddressValidator(testAddress.copy(city = Some(City("  ")))) shouldBe failedResponse("city")
  }

  it should "fail if postcode is missing" in {
    DigipackAddressValidator(testAddress.copy(postcode = None)) shouldBe failedResponse("postcode")
  }
  it should "fail if postcode is just spaces" in {
    DigipackAddressValidator(testAddress.copy(postcode = Some(Postcode("  ")))) shouldBe failedResponse("postcode")
  }

  it should "fail if country is missing" in {
    DigipackAddressValidator(testAddress.copy(country = None)) shouldBe failedResponse("country")
  }
}

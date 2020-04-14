package com.gu.newproduct.api.addsubscription.validation.guardianweekly

import com.gu.i18n.Country
import com.gu.newproduct.api.addsubscription.validation.paper.PaperAddressValidator
import com.gu.newproduct.api.addsubscription.validation.{Failed, Passed}
import com.gu.newproduct.api.addsubscription.zuora.GetContacts._
import com.gu.newproduct.api.productcatalog.PlanId.{HomeDeliveryWeekendPlus, VoucherEveryDay}
import org.scalatest.{FlatSpec, Matchers}

class GuardianWeeklyAddressValidatorTest extends FlatSpec with Matchers {

  val testBillingAddress = BillToAddress(
    Some(Address1("soldToAddress1")),
    Some(Address2("soldToAddress2")),
    Some(City("soldToCity")),
    Some(State("soldToState")),
    Some(Country.UK),
    Some(Postcode("N1 9GU"))
  )

  val testDomesticSoldToAddress = SoldToAddress(
    Some(Address1("soldToAddress1")),
    Some(Address2("soldToAddress2")),
    Some(City("soldToCity")),
    Some(State("soldToState")),
    Country.UK,
    Some(Postcode("N1 9GU"))
  )

  val testROWSoldToAddress = SoldToAddress(
    Some(Address1("soldToAddress1")),
    Some(Address2("soldToAddress2")),
    Some(City("soldToCity")),
    Some(State("soldToState")),
    Country("ZW", "Zimbabwe"),
    Some(Postcode("HR1"))
  )

  it should "succeed for Domestic if delivery address is domestic" in {
    GuardianWeeklyAddressValidator.domesticCountryCodes.foreach { domesticCountryCode =>
      val domesticAddress = testDomesticSoldToAddress.copy(country = Country(domesticCountryCode, domesticCountryCode))
      GuardianWeeklyDomesticAddressValidator(
        testBillingAddress,
        domesticAddress
      ) shouldBe Passed(())
      GuardianWeeklyROWAddressValidator(
        testBillingAddress,
        domesticAddress
      ) shouldBe Failed(s"Delivery address country $domesticCountryCode is not valid for a Guardian Weekly (ROW) subscription")
    }
  }

  it should "succeed for ROW if delivery address is domestic" in {
    GuardianWeeklyAddressValidator.internationalCountryCodes.foreach { rowCountryCode =>
      val domesticAddress = testDomesticSoldToAddress.copy(country = Country(rowCountryCode, rowCountryCode))
      GuardianWeeklyROWAddressValidator(
        testBillingAddress,
        domesticAddress
      ) shouldBe Passed(())
      GuardianWeeklyDomesticAddressValidator(
        testBillingAddress,
        domesticAddress
      ) shouldBe Failed(s"Delivery address country $rowCountryCode is not valid for a Guardian Weekly (Domestic) subscription")
    }
  }

  it should "fail if bill address line 1 is empty" in {
    val invalidBillingAddress = testBillingAddress.copy(address1 = None)
    GuardianWeeklyDomesticAddressValidator(
      invalidBillingAddress,
      testDomesticSoldToAddress
    ) shouldBe Failed(s"bill to address1 must be populated")
    GuardianWeeklyROWAddressValidator(
      invalidBillingAddress,
      testROWSoldToAddress
    ) shouldBe Failed(s"bill to address1 must be populated")
  }

  it should "fail if bill address city is empty" in {
    val invalidBillingAddress = testBillingAddress.copy(city = None)
    GuardianWeeklyDomesticAddressValidator(
      invalidBillingAddress,
      testDomesticSoldToAddress
    ) shouldBe Failed(s"bill to city must be populated")
    GuardianWeeklyROWAddressValidator(
      invalidBillingAddress,
      testROWSoldToAddress
    ) shouldBe Failed(s"bill to city must be populated")
  }

  it should "fail if bill address postcode is empty" in {
    val invalidBillingAddress = testBillingAddress.copy(postcode = None)
    GuardianWeeklyDomesticAddressValidator(
      invalidBillingAddress,
      testDomesticSoldToAddress
    ) shouldBe Failed(s"bill to postcode must be populated")
    GuardianWeeklyROWAddressValidator(
      invalidBillingAddress,
      testROWSoldToAddress
    ) shouldBe Failed(s"bill to postcode must be populated")
  }

  it should "fail if bill address country is empty" in {
    val invalidBillingAddress = testBillingAddress.copy(country = None)
    GuardianWeeklyDomesticAddressValidator(
      invalidBillingAddress,
      testDomesticSoldToAddress
    ) shouldBe Failed(s"bill to country must be populated")
    GuardianWeeklyROWAddressValidator(
      invalidBillingAddress,
      testROWSoldToAddress
    ) shouldBe Failed(s"bill to country must be populated")
  }
}

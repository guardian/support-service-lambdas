package com.gu.newproduct.api.addsubscription.validation.voucher

import com.gu.i18n.Country
import com.gu.newproduct.api.addsubscription.validation.paper.PaperAddressValidator
import com.gu.newproduct.api.addsubscription.validation.{Failed, Passed}
import com.gu.newproduct.api.addsubscription.zuora.GetContacts._
import com.gu.newproduct.api.productcatalog.PlanId.{HomeDeliveryWeekendPlus, VoucherEveryDay}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class PaperAddressValidatorTest extends AnyFlatSpec with Matchers {

  val testAddress = SoldToAddress(
    Some(Address1("soldToAddress1")),
    Some(Address2("soldToAddress2")),
    Some(City("soldToCity")),
    Some(State("soldToState")),
    Country.UK,
    Some(Postcode("N1 9GU")),
  )

  it should "succeed if address in UK" in {
    PaperAddressValidator(VoucherEveryDay, testAddress) shouldBe Passed(())
  }

  it should "succeed if address in UK for one of the new postcodes in the M25" in {
    PaperAddressValidator(VoucherEveryDay, testAddress.copy(postcode = Some(Postcode("TN16 1QA")))) shouldBe Passed(())
  }

  it should "fail if sold to contact is not uk" in {
    val australianAddress = testAddress.copy(country = Country.Australia)
    PaperAddressValidator(VoucherEveryDay, australianAddress) shouldBe Failed(
      "Invalid country: Australia, only UK addresses are allowed",
    )
  }

  it should "fail if postcode is not provided for home delivery plan" in {
    val noPostCodeAddress = testAddress.copy(postcode = None)
    PaperAddressValidator(HomeDeliveryWeekendPlus, noPostCodeAddress) shouldBe Failed("delivery postcode is required")
  }

  it should "fail if postcode is not within the m25 for home delivery plan" in {
    val scottishPostcode = testAddress.copy(postcode = Some(Postcode("EH10 4BF")))
    PaperAddressValidator(HomeDeliveryWeekendPlus, scottishPostcode) shouldBe Failed(
      "Invalid postcode EH10 4BF: postcode must be within M25",
    )
  }

  it should "ignore case in postcode" in {
    val mixedCasePostcode = testAddress.copy(postcode = Some(Postcode("n1 9Gu")))
    PaperAddressValidator(HomeDeliveryWeekendPlus, mixedCasePostcode) shouldBe Passed(())
  }

  it should "ignore whitespaces in postcode" in {
    val extraSpacesPostcode = testAddress.copy(postcode = Some(Postcode("n  1 9  G u")))
    PaperAddressValidator(HomeDeliveryWeekendPlus, extraSpacesPostcode) shouldBe Passed(())
  }
}

package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.SoftOptInError
import com.gu.soft_opt_in_consent_setter.testData.ConsentsCalculatorTestData.{
  contributionMapping,
  guWeeklyMapping,
  membershipMapping,
  newspaperMapping,
  supporterPlusMapping,
  testConsentMappings,
}
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class ConsentsCalculatorTests extends AnyFlatSpec with should.Matchers with EitherValues {

  val calculator = new ConsentsCalculator(testConsentMappings)

  // getAcquisitionConsents success cases
  "getSoftOptInsByProduct" should "correctly return the mapping when a known product is passed" in {
    calculator.getSoftOptInsByProduct("membership") shouldBe Right(membershipMapping)
  }

  // getAcquisitionConsents failure cases
  "getSoftOptInsByProduct" should "correctly return a SoftOptInError when the product isn't present in the mappings" in {
    val result = calculator.getSoftOptInsByProduct("nonexistentProduct")

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.getMessage shouldBe "ConsentsCalculator: getSoftOptInsByProduct couldn't find nonexistentProduct in consentsMappings"
  }

  // getSoftOptInsByProducts success cases
  "getSoftOptInsByProducts" should "correctly return both mappings when two products are passed in" in {
    calculator.getSoftOptInsByProducts(Set("contributions", "supporterPlus")) shouldBe Right(
      contributionMapping ++ supporterPlusMapping,
    )
  }

  // getSoftOptInsByProducts failure cases
  "getSoftOptInsByProducts" should "correctly return a SoftOptInError when the products aren't present in the mappings" in {
    val result = calculator.getSoftOptInsByProducts(Set("nonexistentProduct", "nonexistentProduct"))

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.getMessage shouldBe "ConsentsCalculator: getSoftOptInsByProducts couldn't find nonexistentProduct in consentsMappings"
  }

  // getCancellationConsents success cases
  "getCancellationConsents" should "correctly return the mapping when a known product is passed and there are no owned products" in {
    calculator.getCancellationConsents("membership", Set()) shouldBe Right(membershipMapping)
  }

  "getCancellationConsents" should "correctly return the mapping when a known product is passed and there are owned products but do not overlap" in {
    calculator.getCancellationConsents("membership", Set("testproduct")) shouldBe Right(membershipMapping)
  }

  "getCancellationConsents" should "correctly return the mapping when a known product is passed and there is an owned product that partially overlaps" in {
    calculator.getCancellationConsents("newspaper", Set("guardianweekly")) shouldBe Right(
      newspaperMapping.diff(guWeeklyMapping),
    )
  }

  "getCancellationConsents" should "correctly return the mapping when a known product is passed and there are multiple owned products that partially overlap" in {
    calculator.getCancellationConsents("newspaper", Set("membership", "guardianweekly")) shouldBe Right(
      newspaperMapping.diff(membershipMapping ++ guWeeklyMapping),
    )
  }

  "getCancellationConsents" should "correctly return the mapping when a known product is passed and there is an owned products completely overlaps" in {
    calculator.getCancellationConsents("guardianweekly", Set("membership")) shouldBe Right(
      guWeeklyMapping.diff(membershipMapping),
    )
  }

  "getCancellationConsents" should "correctly return the mapping when a known product is passed and there are multiple owned products that completely overlap" in {
    calculator.getCancellationConsents("guardianweekly", Set("membership", "contributions")) shouldBe Right(
      guWeeklyMapping.diff(membershipMapping ++ contributionMapping),
    )
  }

  def removeWhitespace(stringToRemoveWhitespaceFrom: String): String = {
    stringToRemoveWhitespaceFrom.replaceAll("\\s", "")
  }
}

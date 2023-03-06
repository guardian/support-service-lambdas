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
    result.left.value.errorType shouldBe "ConsentsCalculator"
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
    result.left.value.errorType shouldBe "ConsentsCalculator"
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

  // getCancellationConsents failure cases
  "getCancellationConsents" should "correctly return a SoftOptInError when a unknown product is passed and there are no owned products" in {
    val result = calculator.getCancellationConsents("nonexistentProduct", Set())

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.errorType shouldBe "ConsentsCalculator"
  }

  "getCancellationConsents" should "correctly return a SoftOptInError when a known product is passed and an unknown product is present in the owned products" in {
    val result = calculator.getCancellationConsents("membership", Set("nonexistentProduct"))

    result.isLeft shouldBe true
    result.left.value shouldBe a[SoftOptInError]
    result.left.value.errorType shouldBe "ConsentsCalculator"
  }

  // buildConsentsBody success cases
  "buildConsentsBody" should "return an empty JSON array when consents is empty" in {
    removeWhitespace(calculator.buildConsentsBody(Set(), true)) shouldBe removeWhitespace("""[]""".stripMargin)
  }

  "buildConsentsBody" should "return a correctly populated JSON array when consents is not empty and state is true" in {
    removeWhitespace(calculator.buildConsentsBody(guWeeklyMapping, true)) shouldBe
      removeWhitespace("""[
    |  {
    |    "id" : "your_support_onboarding",
    |    "consented" : true
    |  },
    |  {
    |    "id" : "guardian_weekly_newsletter",
    |    "consented" : true
    |  }
    |]""".stripMargin)
  }

  "buildConsentsBody" should "return a correctly populated JSON array when consents is not empty and state is false" in {
    removeWhitespace(calculator.buildConsentsBody(guWeeklyMapping, false)) shouldBe
      removeWhitespace("""[
    |  {
    |    "id" : "your_support_onboarding",
    |    "consented" : false
    |  },
    |  {
    |    "id" : "guardian_weekly_newsletter",
    |    "consented" : false
    |  }
    |]""".stripMargin)
  }

  def removeWhitespace(stringToRemoveWhitespaceFrom: String): String = {
    stringToRemoveWhitespaceFrom.replaceAll("\\s", "")
  }
}

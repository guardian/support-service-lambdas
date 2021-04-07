package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.SoftOptInError
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

class ConsentsCalculatorTests extends AnyFlatSpec with should.Matchers {

  private val membershipMapping = Set("your_support_onboarding", "similar_guardian_products", "supporter_newsletter")
  private val contributionMapping = Set("your_support_onboarding", "similar_guardian_products", "supporter_newsletter")
  private val newspaperMapping = Set("your_support_onboarding", "similar_guardian_products", "subscriber_preview", "supporter_newsletter")
  private val guWeeklyMapping = Set("your_support_onboarding", "guardian_weekly_newsletter")
  private val testProductMapping = Set("unique_consent")

  private val testConsentMappings = Map(
    "membership" -> membershipMapping,
    "contributions" -> contributionMapping,
    "newspaper" -> newspaperMapping,
    "guardianweekly" -> guWeeklyMapping,
    "testproduct" -> testProductMapping,
  )

  val calculator = new ConsentsCalculator(testConsentMappings)

  // getAcqConsents success cases
  "getAcqConsents" should "correctly returns the mapping when a known product is passed" in {
    calculator.getAcqConsents("membership") shouldBe Right(membershipMapping)
  }

  // getAcqConsents failure cases
  "getAcqConsents" should "correctly return a SoftOptInError when the product isn't present in the mappings" in {
    calculator.getAcqConsents("nonexistentProduct") shouldBe Left(SoftOptInError("ConsentsCalculator", "getAcqConsents couldn't find nonexistentProduct in consentsMappings"))
  }

  // getCancConsents success cases
  "getCancConsents" should "correctly returns the mapping when a known product is passed and there are no owned products" in {
    calculator.getCancConsents("membership", Set()) shouldBe Right(membershipMapping)
  }

  "getCancConsents" should "correctly returns the mapping when a known product is passed and there are owned products but do not overlap" in {
    calculator.getCancConsents("membership", Set("testproduct")) shouldBe Right(membershipMapping)
  }

  "getCancConsents" should "correctly returns the mapping when a known product is passed and there is an owned products partially overlaps" in {
    calculator.getCancConsents("newspaper", Set("guardianweekly")) shouldBe Right(newspaperMapping.diff(guWeeklyMapping))
  }

  "getCancConsents" should "correctly returns the mapping when a known product is passed and there are multiple owned products that partially overlap" in {
    calculator.getCancConsents("newspaper", Set("membership", "guardianweekly")) shouldBe Right(newspaperMapping.diff(membershipMapping ++ guWeeklyMapping))
  }

  "getCancConsents" should "correctly returns the mapping when a known product is passed and there is an owned products completely overlaps" in {
    calculator.getCancConsents("guardianweekly", Set("membership")) shouldBe Right(guWeeklyMapping.diff(membershipMapping))
  }

  "getCancConsents" should "correctly returns the mapping when a known product is passed and there are multiple owned products that completely overlap" in {
    calculator.getCancConsents("guardianweekly", Set("membership", "contributions")) shouldBe Right(guWeeklyMapping.diff(membershipMapping ++ contributionMapping))
  }

  // getCancConsents failure cases
  "getCancConsents" should "correctly return a SoftOptInError when a unknown product is passed and there are no owned products" in {
    calculator.getCancConsents("nonexistentProduct", Set()) shouldBe Left(SoftOptInError("ConsentsCalculator", "getCancConsents couldn't find nonexistentProduct in consentsMappings"))
  }

  "getCancConsents" should "correctly return a SoftOptInError when a known product is passed and an unknown product is present in the owned products" in {
    calculator.getCancConsents("membership", Set("nonexistentProduct")) shouldBe Left(SoftOptInError("ConsentsCalculator", "getCancConsents couldn't find nonexistentProduct in consentsMappings"))
  }

  // buildConsentsBody success cases
  "buildConsentsBody" should "return an empty JSON array when consents is empty" in {
    calculator.buildConsentsBody(Set(), true) shouldBe """[
                                                         |]""".stripMargin
  }

  "buildConsentsBody" should "return a correctly populated JSON array when consents is not empty and state is true" in {
    calculator.buildConsentsBody(guWeeklyMapping, true) shouldBe """[
                                                                   |  {
                                                                   |    "id" : "your_support_onboarding",
                                                                   |    "consented" : true
                                                                   |  },
                                                                   |  {
                                                                   |    "id" : "guardian_weekly_newsletter",
                                                                   |    "consented" : true
                                                                   |  }
                                                                   |]""".stripMargin
  }

  "buildConsentsBody" should "return a correctly populated JSON array when consents is not empty and state is false" in {
    calculator.buildConsentsBody(guWeeklyMapping, false) shouldBe """[
                                                                   |  {
                                                                   |    "id" : "your_support_onboarding",
                                                                   |    "consented" : false
                                                                   |  },
                                                                   |  {
                                                                   |    "id" : "guardian_weekly_newsletter",
                                                                   |    "consented" : false
                                                                   |  }
                                                                   |]""".stripMargin
  }

}


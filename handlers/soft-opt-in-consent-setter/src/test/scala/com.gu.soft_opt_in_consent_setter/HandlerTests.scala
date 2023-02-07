package com.gu.soft_opt_in_consent_setter

import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should
import com.gu.soft_opt_in_consent_setter.testData.ConsentsCalculatorTestData.{testConsentMappings}
import org.scalatest.EitherValues

class HandlerTests extends AnyFlatSpec with should.Matchers with EitherValues {

  def removeWhitespace(stringToRemoveWhitespaceFrom: String): String = {
    stringToRemoveWhitespaceFrom.replaceAll("\\s", "")
  }

  val calculator = new ConsentsCalculator(testConsentMappings)

  "buildProductSwitchConsents" should "return the correct consents when switching from a Recurring Contribution to Guardian Weekly subscription" in {
    Handler.buildProductSwitchConsents(
      "contributions",
      "guardianweekly",
      Set("guardianweekly"),
      calculator,
    ) shouldBe Right("""[
        |  {
        |    "id" : "similar_guardian_products",
        |    "consented" : false
        |  },
        |  {
        |    "id" : "supporter_newsletter",
        |    "consented" : false
        |  },
        |  {
        |    "id" : "guardian_weekly_newsletter",
        |    "consented" : true
        |  }
        |]""".stripMargin)
  }

  "buildProductSwitchConsents" should "return the correct consents when switching from a Recurring Contribution to a Guardian Weekly subscription whilst the user also owns a Newspaper subscription" in {
    Handler.buildProductSwitchConsents(
      "contributions",
      "guardianweekly",
      Set("guardianweekly", "newspaper"),
      calculator,
    ) shouldBe Right("""[
        |  {
        |    "id" : "guardian_weekly_newsletter",
        |    "consented" : true
        |  }
        |]""".stripMargin)
  }

  "buildProductSwitchConsents" should "return the correct consents when switching from a Guardian Weekly to a Newspaper subscription" in {
    Handler.buildProductSwitchConsents(
      "guardianweekly",
      "newspaper",
      Set("newspaper"),
      calculator,
    ) shouldBe Right("""[
        |  {
        |    "id" : "guardian_weekly_newsletter",
        |    "consented" : false
        |  },
        |  {
        |    "id" : "similar_guardian_products",
        |    "consented" : true
        |  },
        |  {
        |    "id" : "subscriber_preview",
        |    "consented" : true
        |  },
        |  {
        |    "id" : "supporter_newsletter",
        |    "consented" : true
        |  }
        |]""".stripMargin)
  }

  "buildProductSwitchConsents" should "return the correct consents when switching from a Guardian Weekly to a Recurring Contribution whilst also owning a Newspaper subscription" in {
    Handler.buildProductSwitchConsents(
      "guardianweekly",
      "contributions",
      Set("newspaper", "contributions"),
      calculator,
    ) shouldBe Right("""[
        |  {
        |    "id" : "guardian_weekly_newsletter",
        |    "consented" : false
        |  }
        |]""".stripMargin)
  }

  "buildProductSwitchConsents" should "return the correct consents when switching from a Guardian Weekly to a Newspaper subscription whilst also owning a Recurring Contribution" in {
    Handler.buildProductSwitchConsents(
      "guardianweekly",
      "newspaper",
      Set("newspaper", "contributions"),
      calculator,
    ) shouldBe Right("""[
        |  {
        |    "id" : "guardian_weekly_newsletter",
        |    "consented" : false
        |  },
        |  {
        |    "id" : "subscriber_preview",
        |    "consented" : true
        |  }
        |]""".stripMargin)
  }
}

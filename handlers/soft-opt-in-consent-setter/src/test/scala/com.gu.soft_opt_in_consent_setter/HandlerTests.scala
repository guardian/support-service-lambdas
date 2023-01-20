package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.ConsentOption
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should
import com.gu.soft_opt_in_consent_setter.testData.ConsentsCalculatorTestData.{
  contributionMapping,
  guWeeklyMapping,
  membershipMapping,
  newspaperMapping,
  supporterPlusMapping,
  testConsentMappings,
}

class HandlerTests extends AnyFlatSpec with should.Matchers {

  val currentConsents1 = Seq(
    ConsentOption("your_support_onboarding", true),
    ConsentOption("supporter_newsletter", false),
    ConsentOption("similar_guardian_products", false),
    ConsentOption("digital_subscriber_preview", false),
    ConsentOption("profiling_optout", false),
    ConsentOption("supporter", false),
    ConsentOption("market_research_optout", false),
    ConsentOption("subscriber_preview", false),
    ConsentOption("guardian_weekly_newsletter", true),
    ConsentOption("personalised_advertising", false),
  )

  val currentConsents2 = Seq(
    ConsentOption("your_support_onboarding", true),
    ConsentOption("supporter_newsletter", true),
    ConsentOption("similar_guardian_products", true),
    ConsentOption("digital_subscriber_preview", true),
    ConsentOption("profiling_optout", true),
    ConsentOption("supporter", true),
    ConsentOption("market_research_optout", true),
    ConsentOption("subscriber_preview", true),
    ConsentOption("guardian_weekly_newsletter", true),
    ConsentOption("personalised_advertising", true),
  )

  "consentsToRemove" should "return the correct soft opt-ins to remove (set as false)" in {
    Handler.consentsToRemove(
      contributionMapping,
      guWeeklyMapping,
    ) shouldBe Set("similar_guardian_products", "supporter_newsletter")
  }

  "consentsToRemove" should "return the correct soft opt-ins to remove (set as false) 2" in {
    Handler.consentsToRemove(
      contributionMapping,
      guWeeklyMapping ++ newspaperMapping,
    ) shouldBe Set()
  }

  "consentsToAdd" should "return the correct soft opt-ins to add (set as true)" in {
    Handler.consentsToAdd(
      guWeeklyMapping,
      newspaperMapping,
      Set(),
    ) shouldBe Set("similar_guardian_products", "subscriber_preview", "supporter_newsletter")
  }

  "consentsToRemove" should "return remove the correct soft opt-ins to remove (set as false) 23" in {
    Handler.consentsToRemove(
      guWeeklyMapping,
      contributionMapping ++ newspaperMapping,
    ) shouldBe Set("guardian_weekly_newsletter")
  }

  "consentsToAdd" should "return the correct soft opt-ins to add (set as true) 2" in {
    Handler.consentsToAdd(
      guWeeklyMapping,
      newspaperMapping,
      contributionMapping,
    ) shouldBe Set("subscriber_preview")
  }
}

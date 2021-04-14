package com.gu.soft_opt_in_consent_setter.testData

import com.gu.soft_opt_in_consent_setter.ConsentsCalculator

object Consents {
  val membershipMapping = Set("your_support_onboarding", "similar_guardian_products", "supporter_newsletter")
  val contributionMapping = Set("your_support_onboarding", "similar_guardian_products", "supporter_newsletter")
  val newspaperMapping = Set("your_support_onboarding", "similar_guardian_products", "subscriber_preview", "supporter_newsletter")
  val guWeeklyMapping = Set("your_support_onboarding", "guardian_weekly_newsletter")
  val testProductMapping = Set("unique_consent")

  val testConsentMappings = Map(
    "membership" -> membershipMapping,
    "contributions" -> contributionMapping,
    "newspaper" -> newspaperMapping,
    "guardianweekly" -> guWeeklyMapping,
    "testproduct" -> testProductMapping,
  )

  val calculator = new ConsentsCalculator(testConsentMappings)

}

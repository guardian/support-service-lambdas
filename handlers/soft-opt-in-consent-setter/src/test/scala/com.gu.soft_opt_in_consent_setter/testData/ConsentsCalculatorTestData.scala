package com.gu.soft_opt_in_consent_setter.testData

object ConsentsCalculatorTestData {
  val membershipMapping = Set("your_support_onboarding", "similar_guardian_products", "supporter_newsletter")
  val contributionMapping = Set("your_support_onboarding", "similar_guardian_products", "supporter_newsletter")
  val supporterPlusMapping =
    Set("your_support_onboarding", "similar_guardian_products", "supporter_newsletter", "digital_subscriber_preview")
  val newspaperMapping =
    Set("your_support_onboarding", "similar_guardian_products", "subscriber_preview", "supporter_newsletter")
  val guWeeklyMapping = Set("your_support_onboarding", "guardian_weekly_newsletter")
  val testProductMapping = Set("unique_consent")

  val testConsentMappings = Map(
    "membership" -> membershipMapping,
    "contributions" -> contributionMapping,
    "supporterPlus" -> supporterPlusMapping,
    "newspaper" -> newspaperMapping,
    "guardianweekly" -> guWeeklyMapping,
    "testproduct" -> testProductMapping,
  )

}

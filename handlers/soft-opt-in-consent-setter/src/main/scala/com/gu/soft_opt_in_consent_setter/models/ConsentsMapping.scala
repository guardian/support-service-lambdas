package com.gu.soft_opt_in_consent_setter.models

object ConsentsMapping {
  val yourSupportOnboarding = "your_support_onboarding"
  val similarGuardianProducts = "similar_guardian_products"
  val supporterNewsletter = "supporter_newsletter"
  val subscriberPreview = "subscriber_preview"
  val guardianWeeklyNewsletter = "guardian_weekly_newsletter"

  val consentsMapping: Map[String, Set[String]] = Map(
    "Membership" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      supporterNewsletter,
    ),
    "Supporter" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      supporterNewsletter,
    ),
    "Contribution" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      supporterNewsletter,
    ),
    "Recurring Contribution" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      supporterNewsletter,
    ),
    "Contributor" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      supporterNewsletter,
    ),
    "newspaper" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      subscriberPreview,
      supporterNewsletter,
    ),
    "Newspaper - Home Delivery" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      subscriberPreview,
      supporterNewsletter,
    ),
    "Newspaper - Voucher Book" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      subscriberPreview,
      supporterNewsletter,
    ),
    "Newspaper - Digital Voucher" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      subscriberPreview,
      supporterNewsletter,
    ),
    "Guardian Weekly" -> Set(
      yourSupportOnboarding,
      guardianWeeklyNewsletter,
    ),
    "Digital Pack" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      supporterNewsletter,
    ),
    "Supporter Plus" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      supporterNewsletter,
    ),
    "Tier Three" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      supporterNewsletter,
      guardianWeeklyNewsletter,
    ),
    "InAppPurchase" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      supporterNewsletter,
    ),
    "Newspaper - National Delivery" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      supporterNewsletter,
      subscriberPreview,
    ),
    "FeastInAppPurchase" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
    ),
    "Guardian Ad-Lite" -> Set(
      yourSupportOnboarding,
    ),
  )
}

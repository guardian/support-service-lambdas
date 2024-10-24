package com.gu.soft_opt_in_consent_setter.models

object ConsentsMapping {
  val yourSupportOnboarding = "your_support_onboarding"
  val similarGuardianProducts = "similar_guardian_products"
  val guardianProductsAndServices = "guardian_products_services"
  val supporterNewsletter = "supporter_newsletter"
  val subscriberPreview = "subscriber_preview"
  val guardianWeeklyNewsletter = "guardian_weekly_newsletter"

  val consentsMapping: Map[String, Set[String]] = Map(
    "Membership" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      guardianProductsAndServices,
      supporterNewsletter,
    ),
    "Supporter" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      guardianProductsAndServices,
      supporterNewsletter,
    ),
    "Contribution" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      guardianProductsAndServices,
      supporterNewsletter,
    ),
    "Recurring Contribution" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      guardianProductsAndServices,
      supporterNewsletter,
    ),
    "Contributor" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      guardianProductsAndServices,
      supporterNewsletter,
    ),
    "newspaper" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      guardianProductsAndServices,
      subscriberPreview,
      supporterNewsletter,
    ),
    "Newspaper - Home Delivery" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      guardianProductsAndServices,
      subscriberPreview,
      supporterNewsletter,
    ),
    "Newspaper - Voucher Book" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      guardianProductsAndServices,
      subscriberPreview,
      supporterNewsletter,
    ),
    "Newspaper - Digital Voucher" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      guardianProductsAndServices,
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
      guardianProductsAndServices,
      supporterNewsletter,
    ),
    "Supporter Plus" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      guardianProductsAndServices,
      supporterNewsletter,
    ),
    "Tier Three" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      guardianProductsAndServices,
      supporterNewsletter,
      guardianWeeklyNewsletter,
    ),
    "InAppPurchase" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      guardianProductsAndServices,
      supporterNewsletter,
    ),
    "Newspaper - National Delivery" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      guardianProductsAndServices,
      supporterNewsletter,
      subscriberPreview,
    ),
    "FeastInAppPurchase" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      guardianProductsAndServices,
    ),
  )
}

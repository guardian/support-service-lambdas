package com.gu.soft_opt_in_consent_setter.models

object ConsentsMapping {
  val yourSupportOnboarding = "your_support_onboarding"
  val supporterNewsletter = "supporter_newsletter"
  val subscriberPreview = "subscriber_preview"
  val guardianWeeklyNewsletter = "guardian_weekly_newsletter"

  val consentsMapping: Map[String, Set[String]] = Map(
    "Membership" -> Set(
      yourSupportOnboarding,
      supporterNewsletter,
    ),
    "Supporter" -> Set(
      yourSupportOnboarding,
      supporterNewsletter,
    ),
    "Contribution" -> Set(
      yourSupportOnboarding,
      supporterNewsletter,
    ),
    "Recurring Contribution" -> Set(
      yourSupportOnboarding,
      supporterNewsletter,
    ),
    "Contributor" -> Set(
      yourSupportOnboarding,
      supporterNewsletter,
    ),
    "newspaper" -> Set(
      yourSupportOnboarding,
      subscriberPreview,
      supporterNewsletter,
    ),
    "Newspaper - Home Delivery" -> Set(
      yourSupportOnboarding,
      subscriberPreview,
      supporterNewsletter,
    ),
    "Newspaper - Voucher Book" -> Set(
      yourSupportOnboarding,
      subscriberPreview,
      supporterNewsletter,
    ),
    "Newspaper - Digital Voucher" -> Set(
      yourSupportOnboarding,
      subscriberPreview,
      supporterNewsletter,
    ),
    "Guardian Weekly" -> Set(
      yourSupportOnboarding,
      guardianWeeklyNewsletter,
    ),
    "Digital Pack" -> Set(
      yourSupportOnboarding,
      supporterNewsletter,
    ),
    "Supporter Plus" -> Set(
      yourSupportOnboarding,
      supporterNewsletter,
    ),
    "Tier Three" -> Set(
      yourSupportOnboarding,
      supporterNewsletter,
      guardianWeeklyNewsletter,
    ),
    "InAppPurchase" -> Set(
      yourSupportOnboarding,
      supporterNewsletter,
    ),
    "Newspaper - National Delivery" -> Set(
      yourSupportOnboarding,
      supporterNewsletter,
      subscriberPreview,
    ),
    "FeastInAppPurchase" -> Set(
      yourSupportOnboarding,
    ),
    "Guardian Ad-Lite" -> Set(
      yourSupportOnboarding,
    ),
  )
}

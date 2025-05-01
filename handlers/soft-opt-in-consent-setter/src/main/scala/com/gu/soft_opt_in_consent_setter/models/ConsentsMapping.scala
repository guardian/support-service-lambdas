package com.gu.soft_opt_in_consent_setter.models

object ConsentsMapping {
  val yourSupportOnboarding = "your_support_onboarding"
  val supporterNewsletter = "supporter_newsletter"
  val subscriberPreview = "subscriber_preview"
  val guardianWeeklyNewsletter = "guardian_weekly_newsletter"

  /*
  This function is needed because when events come from the acquisition event bus, they have an ophan style product name.
   */
  def productMappings(productName: String, printOptions: Option[String]): String = {
    // the values on the left come from https://github.com/guardian/support-frontend/blob/beef97734c1ca1549bc1cb5f1ea5b4501d24fc46/support-modules/acquisition-events/src/main/scala/com/gu/support/acquisitions/models/AcquisitionDataRow.scala#L97
    productName match {
      case "RECURRING_CONTRIBUTION" => "Contribution"
      case "SUPPORTER_PLUS" => "Supporter Plus"
      case "TIER_THREE" => "Tier Three"
      case "DIGITAL_SUBSCRIPTION" => "Digital Pack"
      case "PRINT_SUBSCRIPTION" if !printOptions.contains("GUARDIAN_WEEKLY") => "newspaper"
      case "PRINT_SUBSCRIPTION" if printOptions.contains("GUARDIAN_WEEKLY") => "Guardian Weekly"
      case "GUARDIAN_AD_LITE" => "Guardian Ad-Lite"
      case s"Newspaper - $_" => "newspaper"
      case other => other
    }
  }

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
    "FeastInAppPurchase" -> Set(
      yourSupportOnboarding,
    ),
    "Guardian Ad-Lite" -> Set(
      yourSupportOnboarding,
    ),
  )
}

package com.gu.soft_opt_in_consent_setter.models

object ConsentsMapping {
  val yourSupportOnboarding = "your_support_onboarding"
  val similarGuardianProducts = "similar_guardian_products"
  val supporterNewsletter = "supporter_newsletter"
  val subscriberPreview = "subscriber_preview"
  val guardianWeeklyNewsletter = "guardian_weekly_newsletter"

  private val singleAndRecurringContribution = "Contribution"

  /*
    This function is needed because when events come from the acquisition event bus, they have an ophan style product name.
   */
  def productMappings(productName: String, printProduct: Option[String]): String = {
    // the values on the left come from https://github.com/guardian/support-frontend/blob/beef97734c1ca1549bc1cb5f1ea5b4501d24fc46/support-modules/acquisition-events/src/main/scala/com/gu/support/acquisitions/models/AcquisitionDataRow.scala#L97
    productName match {
      case "RECURRING_CONTRIBUTION" => singleAndRecurringContribution
      case "SUPPORTER_PLUS" => "Supporter Plus"
      case "TIER_THREE" => "Tier Three"
      case "DIGITAL_SUBSCRIPTION" => "Digital Pack"
      case "PRINT_SUBSCRIPTION" if printProduct.exists(List("HOME_DELIVERY_SUNDAY", "VOUCHER_SUNDAY").contains) =>
        "Newspaper - Observer only" // don't set any consents for observer only
      case "PRINT_SUBSCRIPTION" if !printProduct.contains("GUARDIAN_WEEKLY") => "newspaper"
      case "PRINT_SUBSCRIPTION" if printProduct.contains("GUARDIAN_WEEKLY") => "Guardian Weekly"
      case "GUARDIAN_AD_LITE" => "Guardian Ad-Lite"
      case "CONTRIBUTION" /* single */ => singleAndRecurringContribution
      case other => other
    }
  }

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
    singleAndRecurringContribution -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      supporterNewsletter,
    ),
    "Recurring Contribution" -> Set( // unused I think
      yourSupportOnboarding,
      similarGuardianProducts,
      supporterNewsletter,
    ),
    "Contributor" -> Set( // unused I think
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
    "Newspaper - Observer only" -> Set.empty,
    "Newspaper - National Delivery" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
      supporterNewsletter,
      subscriberPreview,
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
    "FeastInAppPurchase" -> Set(
      yourSupportOnboarding,
      similarGuardianProducts,
    ),
    "Guardian Ad-Lite" -> Set(
      yourSupportOnboarding,
    ),
  )
}

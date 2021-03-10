package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.SoftOptInError

object ConsentsCalculator {
  def consentsMappings = Map(
    "membership" -> Set("support_onboarding", "similar_products", "supporter_newsletter"),
    "contributions" -> Set("support_onboarding", "similar_products", "supporter_newsletter"),
    "newspaper" -> Set("support_onboarding", "similar_products", "subscriber_preview", "supporter_newsletter"),
    "homedelivery" -> Set("support_onboarding", "similar_products", "subscriber_preview", "supporter_newsletter"),
    "voucher" -> Set("support_onboarding", "similar_products", "subscriber_preview", "supporter_newsletter"),
    "digitalvoucher" -> Set("support_onboarding", "similar_products", "subscriber_preview", "supporter_newsletter"),
    "guardianweekly" -> Set("support_onboarding", "guardian_weekly_newsletter"),
    "digipack" -> Set("support_onboarding", "similar_products", "supporter_newsletter", "digi_subscriber_preview")
  )

  def getAcqConsents(productName: String): Either[SoftOptInError, Set[String]] =
    consentsMappings
      .get(productName)
      .toRight(SoftOptInError("ConsentsCalculator", s"getAcqConsents couldn't find $productName in consentsMappings"))

  def getCancConsents(canceledProductName: String, ownedProductNames: Set[String]): Either[SoftOptInError, Set[String]] = {
    ownedProductNames.foldLeft[Either[SoftOptInError, Set[String]]](Right(Set())) { (acc, ownedProductName) =>
      consentsMappings
        .get(ownedProductName)
        .toRight(SoftOptInError("ConsentsCalculator", s"getCancConsents couldn't find $ownedProductName in consentsMappings"))
        .flatMap(productConsents =>
          acc match {
            case Right(ownedProductConsents) => Right(ownedProductConsents.union(productConsents))
            case other => other

          })
    }
      .flatMap(ownedProductConsents => {
        consentsMappings
          .get(canceledProductName)
          .toRight(SoftOptInError("ConsentsCalculator", s"getCancConsents couldn't find $canceledProductName in consentsMappings"))
          .flatMap(canceledProductConsents =>
            Right(canceledProductConsents.diff(ownedProductConsents)))
      })
  }
}

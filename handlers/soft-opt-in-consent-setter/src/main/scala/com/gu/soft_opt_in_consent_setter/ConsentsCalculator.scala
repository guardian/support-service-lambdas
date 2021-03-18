package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.SoftOptInError
import io.circe.generic.auto._
import io.circe.syntax._

object ConsentsCalculator {
  def consentsMappings = Map(
    "membership" -> Set("your_support_onboarding", "similar_guardian_products", "supporter_newsletter"),
    "contributions" -> Set("your_support_onboarding", "similar_guardian_products", "supporter_newsletter"),
    "newspaper" -> Set("your_support_onboarding", "similar_guardian_products", "subscriber_preview", "supporter_newsletter"),
    "homedelivery" -> Set("your_support_onboarding", "similar_guardian_products", "subscriber_preview", "supporter_newsletter"),
    "voucher" -> Set("your_support_onboarding", "similar_guardian_products", "subscriber_preview", "supporter_newsletter"),
    "digitalvoucher" -> Set("your_support_onboarding", "similar_guardian_products", "subscriber_preview", "supporter_newsletter"),
    "guardianweekly" -> Set("your_support_onboarding", "guardian_weekly_newsletter"),
    "digipack" -> Set("your_support_onboarding", "similar_guardian_products", "supporter_newsletter", "digital_subscriber_preview")
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
//      .map[Option[Set[String]]] (result =>
//        if (result.isEmpty) None else Some(result)
//      )
  }

  def buildConsentsBody(consents: Set[String], state: Boolean): String = {
    case class consentsObject(id: String, consented: Boolean)

    consents.map(consentsObject(_, state)).asJson.toString()
  }
}

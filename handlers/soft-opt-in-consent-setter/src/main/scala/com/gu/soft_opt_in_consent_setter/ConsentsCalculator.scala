package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.SoftOptInError
import io.circe.generic.auto._
import io.circe.syntax.EncoderOps

class ConsentsCalculator(consentsMappings: Map[String, Set[String]]) {

  case class ConsentsObject(id: String, consented: Boolean)

  def getSoftOptInsByProduct(productName: String): Either[SoftOptInError, Set[String]] = {
    consentsMappings
      .get(productName)
      .toRight(
        SoftOptInError(
          s"ConsentsCalculator: getSoftOptInsByProduct couldn't find $productName in consentsMappings",
        ),
      )
  }

  def getSoftOptInsByProducts(productNames: Set[String]): Either[SoftOptInError, Set[String]] = {
    productNames
      .foldLeft[Either[SoftOptInError, Set[String]]](Right(Set())) { (acc, ownedProductName) =>
        consentsMappings
          .get(ownedProductName)
          .toRight(
            SoftOptInError(
              s"ConsentsCalculator: getSoftOptInsByProducts couldn't find $ownedProductName in consentsMappings",
            ),
          )
          .flatMap(productConsents => acc.map(_.union(productConsents)))
      }
  }

  def getCancellationConsents(
      cancelledProductName: String,
      ownedProductNames: Set[String],
  ): Either[SoftOptInError, Set[String]] = {
    ownedProductNames
      .foldLeft[Either[SoftOptInError, Set[String]]](Right(Set())) { (acc, ownedProductName) =>
        consentsMappings
          .get(ownedProductName)
          .toRight(
            SoftOptInError(
              s"ConsentsCalculator: getCancellationConsents couldn't find $ownedProductName in consentsMappings",
            ),
          )
          .flatMap(productConsents => acc.map(_.union(productConsents)))
      }
      .flatMap(ownedProductConsents => {
        consentsMappings
          .get(cancelledProductName)
          .toRight(
            SoftOptInError(
              s"ConsentsCalculator: getCancellationConsents couldn't find $cancelledProductName in consentsMappings",
            ),
          )
          .flatMap(cancelledProductConsents => Right(cancelledProductConsents.diff(ownedProductConsents)))
      })
  }

  def buildConsentsBody(consents: Set[String], state: Boolean): String = {
    consents.map(ConsentsObject(_, state)).asJson.toString()
  }

  def removeSimilarGuardianProductFromSet(consents: Set[String]): Set[String] = {
    // This method was added during https://github.com/guardian/support-service-lambdas/pull/2130
    // for the sole purpose of removing similar_guardian_products to the set of consents that are
    // passed sendCancellationConsents. If one day more than one consent needs to be excluded from
    // being turned off, then the author of the change can adopt the same method, but should
    // probably rename this function

    consents - "similar_guardian_products"
  }

}

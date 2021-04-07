package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.SoftOptInError
import io.circe.generic.auto._
import io.circe.syntax.EncoderOps

class ConsentsCalculator(consentsMappings: Map[String, Set[String]]) {

  def getAcqConsents(productName: String): Either[SoftOptInError, Set[String]] = {
    consentsMappings
      .get(productName)
      .toRight(
        SoftOptInError(
          "ConsentsCalculator",
          s"getAcqConsents couldn't find $productName in consentsMappings"
        )
      )
  }

  def getCancConsents(cancelledProductName: String, ownedProductNames: Set[String]): Either[SoftOptInError, Set[String]] = {
    ownedProductNames
      .foldLeft[Either[SoftOptInError, Set[String]]](Right(Set())) {
        (acc, ownedProductName) =>
          consentsMappings
            .get(ownedProductName)
            .toRight(
              SoftOptInError(
                "ConsentsCalculator",
                s"getCancConsents couldn't find $ownedProductName in consentsMappings"
              )
            )
            .flatMap(productConsents =>
              acc match {
                case Right(ownedProductConsents) =>
                  Right(ownedProductConsents.union(productConsents))
                case other => other

              })
      }
      .flatMap(ownedProductConsents => {
        consentsMappings
          .get(cancelledProductName)
          .toRight(
            SoftOptInError(
              "ConsentsCalculator",
              s"getCancConsents couldn't find $cancelledProductName in consentsMappings"
            )
          )
          .flatMap(cancelledProductConsents =>
            Right(cancelledProductConsents.diff(ownedProductConsents)))
      })
  }

  def buildConsentsBody(consents: Set[String], state: Boolean): String = {
    case class consentsObject(id: String, consented: Boolean)
    consents.map(consentsObject(_, state)).asJson.toString()
  }
}

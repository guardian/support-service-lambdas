package com.gu.soft_opt_in_consent_setter

import com.gu.soft_opt_in_consent_setter.models.ConsentsMapping.similarGuardianProducts
import com.gu.soft_opt_in_consent_setter.models.SoftOptInError
import com.typesafe.scalalogging.LazyLogging
import io.circe.Encoder
import io.circe.generic.semiauto._
import io.circe.syntax.EncoderOps

class ConsentsCalculator(consentsMappings: Map[String, Set[String]]) extends LazyLogging {

  case class ConsentsObject(id: String, consented: Boolean)
  object ConsentsObject {
    implicit val encoder: Encoder[ConsentsObject] = deriveEncoder[ConsentsObject]
  }

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

  def buildConsentsBody(consents: Map[String, Boolean]): String = {
    consents.map { case (consent, state) => ConsentsObject(consent, state) }.asJson.toString()
  }

  def buildProductSwitchConsents(
      oldProductName: String,
      newProductName: String,
      allProductsForUser: Set[String],
  ): Either[SoftOptInError, String] = {
    for {
      oldProductSoftOptIns <- getSoftOptInsByProduct(oldProductName)
      newProductSoftOptIns <- getSoftOptInsByProduct(newProductName)
      currentProductSoftOptIns <- getSoftOptInsByProducts(allProductsForUser)
      allOtherProductSoftOptIns <- getSoftOptInsByProducts(allProductsForUser - newProductName)

      toRemove = oldProductSoftOptIns.diff(currentProductSoftOptIns).map(ConsentsObject(_, false))
      toAdd = newProductSoftOptIns
        .filter(option => !oldProductSoftOptIns.contains(option) && !allOtherProductSoftOptIns.contains(option))
        .filterNot(_ == similarGuardianProducts)
        .map(ConsentsObject(_, true))

      consentsBody = (toRemove ++ toAdd).asJson.toString()
    } yield consentsBody
  }

  // If the identity account doesn't exist (404) then there are no consents to set, so we treat that as success.
  def sendCancellationConsents(
      identityId: String,
      consents: Set[String],
      sendConsentsReq: (String, String) => Either[SoftOptInError, Unit],
  ): Either[SoftOptInError, Unit] = {
    if (consents.isEmpty) {
      Right(())
    } else {
      val consentsBody = buildConsentsBody(consents.map(_ -> false).toMap)
      logger.info(s"(cancellation) Sending consents request for identityId $identityId with payload: $consentsBody")
      sendConsentsReq(identityId, consentsBody).left.flatMap { error =>
        if (error.statusCode.contains(404)) {
          logger.warn(s"(cancellation) Consents request for $identityId failed with 404 Not Found")
          Right(())
        } else {
          Left(error)
        }
      }
    }
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

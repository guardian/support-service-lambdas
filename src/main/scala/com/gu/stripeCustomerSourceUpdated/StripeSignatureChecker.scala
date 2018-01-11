package com.gu.stripeCustomerSourceUpdated

import com.gu.stripeCustomerSourceUpdated.SourceUpdatedSteps.logger
import com.gu.util.StripeConfig
import com.stripe.exception.SignatureVerificationException
import com.stripe.net.Webhook.Signature

import scala.util.Try

object StripeSignatureChecker {

  def verifyStripeSignature(stripeConfig: StripeConfig, headers: Map[String, String], payload: String) =
    verifyStripeSignatureForAccount(stripeConfig.ukStripeSecretKey.key, headers, payload) || verifyStripeSignatureForAccount(stripeConfig.auStripeSecretKey.key, headers, payload)

  private def verifyStripeSignatureForAccount(secretKey: String, headers: Map[String, String], payload: String) = {
    val signatureHeader: Option[String] = headers.get("Stripe-Signature")
    val headerVerified: Try[Boolean] = Try(Signature.verifyHeader(payload, signatureHeader.get, secretKey, 1000l))

    val falseIfNotSigned = headerVerified recover {
      case e: SignatureVerificationException => {
        logger.error(s"something went wrong with sig header: ${e.getSigHeader} D:< with message ${e.getMessage}")
        false
      }
      case e: Throwable => {
        logger.error(s"something went wrong with verifying the signature header D:< with message ${e.getMessage}")
        false
      }
    }
    falseIfNotSigned.get //because false if any throwable
  }
}

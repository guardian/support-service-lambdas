package com.gu.stripeCardUpdated

import com.gu.util.config.{StripeConfig, StripeSecretKey}
import com.gu.util.Logging
import com.stripe.exception.SignatureVerificationException
import com.stripe.net.Webhook.Signature

import scala.util.{Failure, Success, Try}

case class StripeDeps(config: StripeConfig, signatureChecker: SignatureChecker)

object StripeRequestSignatureChecker extends Logging {
  def verifyRequest(
      stripeDeps: StripeDeps,
      headers: Map[String, String],
      payload: String,
      stripeAccount: Option[StripeAccount],
  ): Boolean = {
    val signatureHeader: Option[String] = headers.get("Stripe-Signature")

    stripeAccount.exists { account =>
      val secretKey =
        if (account == StripeAccount.GNM_Membership_AUS) stripeDeps.config.customerUpdatedWebhook.auStripeSecretKey
        else stripeDeps.config.customerUpdatedWebhook.ukStripeSecretKey
      val headerVerified: Try[Boolean] =
        Try(stripeDeps.signatureChecker.verifySignature(secretKey, payload, signatureHeader, 10000L))

      headerVerified match {
        case Success(verified) => verified
        case Failure(e: SignatureVerificationException) => {
          logger.error(s"Signature header was not validated ${e.getSigHeader}", e)
          false
        }
        case Failure(e: Throwable) => {
          logger.error(s"something went wrong with verifying the signature header", e)
          false
        }
      }
    }
  }
}

trait SignatureChecker {
  def verifySignature(
      secretKey: StripeSecretKey,
      payload: String,
      signatureHeader: Option[String],
      tolerance: Long,
  ): Boolean
}

class StripeSignatureChecker extends SignatureChecker {
  def verifySignature(
      secretKey: StripeSecretKey,
      payload: String,
      signatureHeader: Option[String],
      tolerance: Long,
  ): Boolean =
    signatureHeader.exists(header => Signature.verifyHeader(payload, header, secretKey.key, tolerance))

}

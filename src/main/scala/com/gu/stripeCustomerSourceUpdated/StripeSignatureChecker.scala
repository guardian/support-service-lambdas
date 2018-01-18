package com.gu.stripeCustomerSourceUpdated

import com.gu.stripeCustomerSourceUpdated.SourceUpdatedSteps.logger
import com.gu.util.apigateway.StripeAccount
import com.gu.util.{ StripeConfig, StripeSecretKey }
import com.stripe.exception.SignatureVerificationException
import com.stripe.net.Webhook.Signature

import scala.util.{ Failure, Success, Try }

case class StripeDeps(config: StripeConfig, signatureChecker: SignatureChecker)

object StripeRequestSignatureChecker {
  def verifyRequest(stripeDeps: StripeDeps, headers: Map[String, String], payload: String, stripeAccount: Option[StripeAccount]): Boolean = {
    val signatureHeader: Option[String] = headers.get("Stripe-Signature")

    stripeAccount.exists { account =>
      val secretKey = if (account == StripeAccount.GNM_Membership_AUS) stripeDeps.config.customerSourceUpdatedWebhook.auStripeSecretKey else stripeDeps.config.customerSourceUpdatedWebhook.ukStripeSecretKey
      val headerVerified: Try[Boolean] = Try(stripeDeps.signatureChecker.verifySignature(secretKey, payload, signatureHeader, 10000l))

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
  def verifySignature(secretKey: StripeSecretKey, payload: String, signatureHeader: Option[String], tolerance: Long): Boolean
}

class StripeSignatureChecker extends SignatureChecker {
  def verifySignature(secretKey: StripeSecretKey, payload: String, signatureHeader: Option[String], tolerance: Long): Boolean =
    signatureHeader.exists(header => Signature.verifyHeader(payload, header, secretKey.key, tolerance))

}
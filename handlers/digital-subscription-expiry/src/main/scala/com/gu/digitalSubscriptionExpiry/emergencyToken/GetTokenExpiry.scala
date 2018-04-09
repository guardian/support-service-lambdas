package com.gu.digitalSubscriptionExpiry.emergencyToken

import com.gu.cas.Valid
import com.gu.digitalSubscriptionExpiry.DigitalSubscriptionExpirySteps.logger
import TokenPayloadImplicits._
import com.gu.digitalSubscriptionExpiry.{DigitalSubscriptionExpiryResponse, Expiry, ExpiryType}
import scala.util.{Success, Try}

object GetTokenExpiry {
  def apply(emergencyTokens: EmergencyTokens)(subscriberId: String): Option[DigitalSubscriptionExpiryResponse] = {

    val upperCaseSubId = subscriberId.toUpperCase
    if (!upperCaseSubId.startsWith(emergencyTokens.prefix)) {
      None
    } else {
      logger.info(s"EMERGENCY PROVIDER triggered for subscriber id:'$upperCaseSubId'")

      Try(emergencyTokens.codec.decode(upperCaseSubId)) match {

        case Success(Valid(payload)) =>
          logger.info(s"subscriber id:'$upperCaseSubId' resolves to $payload")
          logger.info(s"subscriber id:'$upperCaseSubId' was created on ${payload.creationDate}")
          val expiry = Expiry(
            expiryDate = payload.expiryDate,
            expiryType = ExpiryType.SUB,
            subscriptionCode = Some(payload.subscriptionCode),
            provider = Some(emergencyTokens.prefix)
          )
          Some(DigitalSubscriptionExpiryResponse(expiry))

        case errorResponse =>
          logger.error(s"error decoding token $subscriberId :  $errorResponse")
          None
      }
    }
  }
}

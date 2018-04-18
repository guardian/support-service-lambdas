package com.gu.digitalSubscriptionExpiry.emergencyToken

import com.gu.cas.Valid
import com.gu.digitalSubscriptionExpiry.DigitalSubscriptionExpirySteps.logger
import TokenPayloadImplicits._
import com.gu.digitalSubscriptionExpiry.{Expiry, ExpiryType, SuccessResponse}
import com.gu.util.reader.Types.FailableOp
import scalaz.{-\/, \/-}
import com.gu.digitalSubscriptionExpiry.common.CommonApiResponses._

import scala.util.{Success, Try}

object GetTokenExpiry {
  def apply(emergencyTokens: EmergencyTokens)(subscriberId: String): FailableOp[Unit] = {

    val upperCaseSubId = subscriberId.toUpperCase
    if (!upperCaseSubId.startsWith(emergencyTokens.prefix)) {
      \/-(())
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
          -\/(apiResponse(SuccessResponse(expiry), "200"))

        case errorResponse =>
          logger.error(s"error decoding token $subscriberId :  $errorResponse")
          \/-(())
      }
    }
  }
}

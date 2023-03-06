package com.gu.digitalSubscriptionExpiry.emergencyToken

import java.time.LocalDate

import com.gu.cas.Valid
import TokenPayloadImplicits._
import com.gu.util.reader.Types.ApiGatewayOp
import ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.digitalSubscriptionExpiry.responses.{Expiry, ExpiryType, SuccessResponse}
import com.gu.util.apigateway.ApiGatewayResponse
import com.typesafe.scalalogging.LazyLogging

import scala.util.{Success, Try}

object GetTokenExpiry extends LazyLogging {
  def apply(emergencyTokens: EmergencyTokens, today: () => LocalDate)(subscriberId: String): ApiGatewayOp[Unit] = {

    val upperCaseSubId = subscriberId.toUpperCase
    if (!upperCaseSubId.startsWith(emergencyTokens.prefix)) {
      ContinueProcessing(())
    } else {
      logger.info(s"EMERGENCY PROVIDER triggered for subscriber id:'$upperCaseSubId'")

      Try(emergencyTokens.codec.decode(upperCaseSubId)) match {

        case Success(Valid(payload)) =>
          logger.info(s"subscriber id:'$upperCaseSubId' resolves to $payload")
          logger.info(s"subscriber id:'$upperCaseSubId' was created on day of era: ${payload.creationDateOffset}")
          val expiry = Expiry(
            expiryDate = payload.jExpiryDate(today()),
            expiryType = ExpiryType.SUB,
            subscriptionCode = Some(payload.subscriptionCode),
            provider = Some(emergencyTokens.prefix),
          )
          ReturnWithResponse(ApiGatewayResponse("200", SuccessResponse(expiry)))

        case errorResponse =>
          logger.error(s"error decoding token $subscriberId :  $errorResponse")
          ContinueProcessing(())
      }
    }
  }
}

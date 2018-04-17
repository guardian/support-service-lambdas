package com.gu.digitalSubscriptionExpiry.zuora

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME

import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.SubscriptionResult
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.FailableOp
import com.gu.util.zuora.ZuoraReaders.unitReads
import com.gu.util.zuora.{Logging, ZuoraDeps, ZuoraRestRequestMaker}
import play.api.libs.json.Json
import scalaz.\/-

object UpdateSubscription extends Logging {

  case class UpdateRequestBody(ActivationDate__c: String)

  implicit val writes = Json.writes[UpdateRequestBody]

  def asIsoString(date: LocalDateTime) = date.format(ISO_LOCAL_DATE_TIME)

  def apply(zuoraDeps: ZuoraDeps)(subscription: SubscriptionResult, activationDate: String = asIsoString(LocalDateTime.now())): FailableOp[Unit] =
    subscription.casActivationDate.fold {
      logger.debug(s"Setting activation date ($activationDate) in subscription ${subscription}")
      ZuoraRestRequestMaker(zuoraDeps).put[UpdateRequestBody, Unit](UpdateRequestBody(activationDate), s"subscriptions/${subscription.id.get}").leftMap(clientFail => ApiGatewayResponse.internalServerError(s"zuora client fail: ${clientFail.message}"))
    } { date =>
      logger.debug(s"Activation date already present ($date) in subscription ${subscription}")
      \/-(())
    }
}

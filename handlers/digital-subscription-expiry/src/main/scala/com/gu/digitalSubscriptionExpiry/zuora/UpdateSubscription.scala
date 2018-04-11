package com.gu.digitalSubscriptionExpiry.zuora

import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.SubscriptionId
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.FailableOp
import com.gu.util.zuora.ZuoraReaders.unitReads
import com.gu.util.zuora.{ZuoraDeps, ZuoraRestRequestMaker}
import play.api.libs.json.Json

object UpdateSubscription {

  case class UpdateRequestBody(ActivationDate__c: String)

  implicit val writes = Json.writes[UpdateRequestBody]

  def apply(zuoraDeps: ZuoraDeps)(subscriptionId: SubscriptionId, activationDate: String): FailableOp[Unit] =
    ZuoraRestRequestMaker(zuoraDeps).put[UpdateRequestBody, Unit](UpdateRequestBody(activationDate), s"subscriptions/${subscriptionId.get}").leftMap(clientFail => ApiGatewayResponse.internalServerError(s"zuora client fail: ${clientFail.message}"))
}

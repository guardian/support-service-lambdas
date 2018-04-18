package com.gu.digitalSubscriptionExpiry.zuora

import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.SubscriptionResult
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.FailableOp
import com.gu.util.zuora.Logging
import com.gu.util.zuora.RestRequestMaker.Requests
import com.gu.util.zuora.ZuoraReaders.unitReads
import play.api.libs.json.Json

object UpdateSubscription extends Logging {

  case class UpdateRequestBody(ActivationDate__c: String)

  implicit val writes = Json.writes[UpdateRequestBody]

  def apply(requests: Requests)(subscription: SubscriptionResult, activationDate: String): FailableOp[Unit] =
    requests.put[UpdateRequestBody, Unit](UpdateRequestBody(activationDate), s"subscriptions/${subscription.id.get}").leftMap(clientFail => ApiGatewayResponse.internalServerError(s"zuora client fail: ${clientFail.message}"))

}

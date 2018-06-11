package com.gu.digitalSubscriptionExpiry.zuora

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME

import com.gu.digitalSubscriptionExpiry.zuora.GetSubscription.SubscriptionId
import com.gu.util.zuora.Logging
import com.gu.util.zuora.RestRequestMaker.{ClientFailableOp, Requests}
import play.api.libs.json.{JsSuccess, Json, Reads}

object SetActivationDate extends Logging {

  case class UpdateRequestBody(ActivationDate__c: String)

  implicit val writes = Json.writes[UpdateRequestBody]

  implicit val unitReads: Reads[Unit] =
    Reads(_ => JsSuccess(()))

  def apply(requests: Requests, now: () => LocalDateTime)(subscriptionId: SubscriptionId): ClientFailableOp[Unit] = {
    val activationDateString = now().format(ISO_LOCAL_DATE_TIME)
    requests.put[UpdateRequestBody, Unit](UpdateRequestBody(activationDateString), s"subscriptions/${subscriptionId.value}")
  }

}

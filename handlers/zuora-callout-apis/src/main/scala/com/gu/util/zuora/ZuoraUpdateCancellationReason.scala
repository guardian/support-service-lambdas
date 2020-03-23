package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import com.gu.util.zuora.ZuoraGetAccountSummary.SubscriptionId
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json.{JsSuccess, Json, Reads, Writes}

object ZuoraUpdateCancellationReason extends LazyLogging {

  case class SubscriptionUpdate(cancellationReason: String)

  implicit val subscriptionUpdateWrites = new Writes[SubscriptionUpdate] {
    def writes(subscriptionUpdate: SubscriptionUpdate) = Json.obj(
      "CancellationReason__c" -> subscriptionUpdate.cancellationReason
    )
  }

  implicit val unitReads: Reads[Unit] =
    Reads(_ => JsSuccess(()))

  def apply(requests: Requests)(subscription: SubscriptionId): ClientFailableOp[Unit] = {
    val msg = s"DRY run for ZuoraUpdateCancellationReason: ${SubscriptionUpdate("System AutoCancel")}" +
      s" at path: subscriptions/${subscription.id}"
    logger.info(msg)
    //    requests.put(SubscriptionUpdate("System AutoCancel"), s"subscriptions/${subscription.id}"): ClientFailableOp[Unit]
    ClientSuccess(msg)
  }

}

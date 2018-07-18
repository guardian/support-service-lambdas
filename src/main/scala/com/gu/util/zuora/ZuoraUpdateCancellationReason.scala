package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.ZuoraGetAccountSummary.SubscriptionId
import play.api.libs.json.{JsSuccess, Json, Reads, Writes}

object ZuoraUpdateCancellationReason {

  case class SubscriptionUpdate(cancellationReason: String)

  implicit val subscriptionUpdateWrites = new Writes[SubscriptionUpdate] {
    def writes(subscriptionUpdate: SubscriptionUpdate) = Json.obj(
      "CancellationReason__c" -> subscriptionUpdate.cancellationReason
    )
  }

  implicit val unitReads: Reads[Unit] =
    Reads(_ => JsSuccess(()))

  def apply(requests: Requests)(subscription: SubscriptionId): ClientFailableOp[Unit] =
    requests.put(SubscriptionUpdate("System AutoCancel"), s"subscriptions/${subscription.id}"): ClientFailableOp[Unit]

}

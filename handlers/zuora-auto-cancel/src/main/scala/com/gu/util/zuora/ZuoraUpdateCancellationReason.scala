package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.{JsSuccess, Json, Reads, Writes}

trait CancellationReasonUpdater {
  def update(subscription: SubscriptionNumber): ClientFailableOp[Unit]
}

class ZuoraUpdateCancellationReason(requests: Requests) extends CancellationReasonUpdater {
  import ZuoraUpdateCancellationReason._

  override def update(subscription: SubscriptionNumber): ClientFailableOp[Unit] = {
    val (body, path) = toBodyAndPath(subscription)
    requests.put(body, path): ClientFailableOp[Unit]
  }
}

object ZuoraUpdateCancellationReason {

  case class SubscriptionUpdate(cancellationReason: String)

  implicit val subscriptionUpdateWrites: Writes[SubscriptionUpdate] = new Writes[SubscriptionUpdate] {
    def writes(subscriptionUpdate: SubscriptionUpdate) = Json.obj(
      "CancellationReason__c" -> subscriptionUpdate.cancellationReason,
    )
  }

  implicit val unitReads: Reads[Unit] =
    Reads(_ => JsSuccess(()))

  private def toBodyAndPath(subscription: SubscriptionNumber) =
    (SubscriptionUpdate("System AutoCancel"), s"subscriptions/${subscription.value}")

}

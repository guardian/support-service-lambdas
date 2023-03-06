package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json.{JsSuccess, Json, Reads, Writes}

object ZuoraUpdateCancellationReason extends LazyLogging {

  case class SubscriptionUpdate(cancellationReason: String)

  implicit val subscriptionUpdateWrites = new Writes[SubscriptionUpdate] {
    def writes(subscriptionUpdate: SubscriptionUpdate) = Json.obj(
      "CancellationReason__c" -> subscriptionUpdate.cancellationReason,
    )
  }

  implicit val unitReads: Reads[Unit] =
    Reads(_ => JsSuccess(()))

  private def toBodyAndPath(subscription: SubscriptionNumber) =
    (SubscriptionUpdate("System AutoCancel"), s"subscriptions/${subscription.value}")

  def apply(requests: Requests)(subscription: SubscriptionNumber): ClientFailableOp[Unit] = {
    val (body, path) = toBodyAndPath(subscription)
    requests.put(body, path): ClientFailableOp[Unit]
  }

  def dryRun(requests: Requests)(subscription: SubscriptionNumber): ClientFailableOp[Unit] = {
    val (body, path) = toBodyAndPath(subscription)
    val msg = s"DryRun for ZuoraUpdateCancellationReason: body=$body, path=$path"
    logger.info(msg)
    ClientSuccess(())
  }

}

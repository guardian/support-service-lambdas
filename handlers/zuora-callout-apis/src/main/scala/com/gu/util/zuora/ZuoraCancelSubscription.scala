package com.gu.util.zuora

import java.time.LocalDate

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import com.gu.util.zuora.ZuoraGetAccountSummary.SubscriptionId
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json.{JsSuccess, Json, Reads, Writes}

object ZuoraCancelSubscription extends LazyLogging {

  case class SubscriptionCancellation(cancellationEffectiveDate: LocalDate)

  implicit val subscriptionCancellationWrites = new Writes[SubscriptionCancellation] {
    def writes(subscriptionCancellation: SubscriptionCancellation) = Json.obj(
      "cancellationEffectiveDate" -> subscriptionCancellation.cancellationEffectiveDate,
      "cancellationPolicy" -> "SpecificDate",
      "invoiceCollect" -> false
    )
  }

  implicit val unitReads: Reads[Unit] =
    Reads(_ => JsSuccess(()))

  private def toBodyAndPath(subscription: SubscriptionId, cancellationDate: LocalDate) =
    (SubscriptionCancellation(cancellationDate), s"subscriptions/${subscription.id}/cancel")

  def apply(requests: Requests)(subscription: SubscriptionId, cancellationDate: LocalDate): ClientFailableOp[Unit] = {
    val (body, path) = toBodyAndPath(subscription, cancellationDate)
    requests.put(body, path)
  }

  def dryRun(requests: Requests)(subscription: SubscriptionId, cancellationDate: LocalDate): ClientFailableOp[Unit] = {
    val (body, path) = toBodyAndPath(subscription, cancellationDate)
    val msg = s"DRY run for ZuoraCancelSubscription: body=$body, path=$path"
    logger.info(msg)
    ClientSuccess(())
  }

}

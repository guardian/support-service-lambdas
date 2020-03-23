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

  def apply(requests: Requests)(subscription: SubscriptionId, cancellationDate: LocalDate): ClientFailableOp[Unit] = {
    val msg = s"DRY run for ZuoraCancelSubscription: ${SubscriptionCancellation(cancellationDate)} " +
      s"at path: subscriptions/${subscription.id}/cancel"
    logger.info(msg)
    //    requests.put(SubscriptionCancellation(cancellationDate), s"subscriptions/${subscription.id}/cancel")
    ClientSuccess(msg)
  }

}

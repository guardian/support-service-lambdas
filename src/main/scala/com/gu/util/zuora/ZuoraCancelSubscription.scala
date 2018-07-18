package com.gu.util.zuora

import java.time.LocalDate

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.ZuoraGetAccountSummary.SubscriptionId
import play.api.libs.json.{JsSuccess, Json, Reads, Writes}

object ZuoraCancelSubscription {

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

  def apply(requests: Requests)(subscription: SubscriptionId, cancellationDate: LocalDate): ClientFailableOp[Unit] =
    requests.put(SubscriptionCancellation(cancellationDate), s"subscriptions/${subscription.id}/cancel"): ClientFailableOp[Unit]

}

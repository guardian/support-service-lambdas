package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json.{Json, Writes}

import java.time.LocalDate

object ZuoraCancelSubscription extends LazyLogging {

  private val zuoraApiMinorVersion = "315.0"

  case class SubscriptionCancellation(cancellationEffectiveDate: LocalDate)

  case class CancellationResponse(invoiceId: String)

  implicit val cancellationResponseReads = Json.reads[CancellationResponse]

  implicit val subscriptionCancellationWrites = new Writes[SubscriptionCancellation] {
    def writes(subscriptionCancellation: SubscriptionCancellation) = Json.obj(
      "cancellationEffectiveDate" -> subscriptionCancellation.cancellationEffectiveDate,
      "cancellationPolicy" -> "SpecificDate",
      "runBilling" -> true,
      "collect" -> false,
    )
  }

  private def toBodyAndPath(subscription: SubscriptionNumber, cancellationDate: LocalDate) =
    (SubscriptionCancellation(cancellationDate), s"subscriptions/${subscription.value}/cancel")

  def apply(
      requests: Requests,
  )(subscription: SubscriptionNumber, cancellationDate: LocalDate): ClientFailableOp[CancellationResponse] = {
    val (body, path) = toBodyAndPath(subscription, cancellationDate)
    requests.put[SubscriptionCancellation, CancellationResponse](body, path, "zuora-version" -> zuoraApiMinorVersion)
  }

  def dryRun(
      requests: Requests,
  )(subscription: SubscriptionNumber, cancellationDate: LocalDate): ClientFailableOp[CancellationResponse] = {
    val (body, path) = toBodyAndPath(subscription, cancellationDate)
    val msg = s"DryRun for ZuoraCancelSubscription: body=$body, path=$path"
    logger.info(msg)
    ClientSuccess(CancellationResponse("balancingInvoiceId"))
  }
}

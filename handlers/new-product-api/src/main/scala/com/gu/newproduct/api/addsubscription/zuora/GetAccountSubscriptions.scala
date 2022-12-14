package com.gu.newproduct.api.addsubscription.zuora

import com.gu.newproduct.api.addsubscription.ZuoraAccountId
import com.gu.newproduct.api.productcatalog.ZuoraIds.ProductRatePlanId
import com.gu.util.resthttp.RestRequestMaker.{RequestsGet, WithCheck}
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.Json

object GetAccountSubscriptions {

  object WireModel {
    case class ZuoraSubscriptionsResponse(subscriptions: List[ZuoraSubscription])
    case class ZuoraRatePlan(
        productRatePlanId: String,
    )

    case class ZuoraSubscription(
        subscriptionNumber: String,
        status: String,
        ratePlans: List[ZuoraRatePlan],
    )

    def fromWire(zuoraSubscription: ZuoraSubscription): Subscription = Subscription(
      status = if (zuoraSubscription.status == "Active") Active else NotActive,
      productRateplanIds = zuoraSubscription.ratePlans.map(rp => ProductRatePlanId(rp.productRatePlanId)).toSet,
    )

    implicit val zuoraRateplanReads = Json.reads[ZuoraRatePlan]
    implicit val zuoraSubscriptionReads = Json.reads[ZuoraSubscription]
    implicit val zuoraSubscriptionsResponseReads = Json.reads[ZuoraSubscriptionsResponse]
  }

  import WireModel._

  sealed trait SubscriptionStatus

  object Active extends SubscriptionStatus

  object NotActive extends SubscriptionStatus

  case class Subscription(
      status: SubscriptionStatus,
      productRateplanIds: Set[ProductRatePlanId],
  )

  def apply(get: RequestsGet[ZuoraSubscriptionsResponse])(
      accountId: ZuoraAccountId,
  ): ClientFailableOp[List[Subscription]] =
    get(s"subscriptions/accounts/${accountId.value}", WithCheck).map(_.subscriptions.map(fromWire))

}

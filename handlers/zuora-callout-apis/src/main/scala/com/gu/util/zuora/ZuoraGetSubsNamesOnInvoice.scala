package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json.JsValue

final case class SubscriptionNumber(value: String)

object ZuoraGetSubsNamesOnInvoice extends LazyLogging {

  def apply(requests: Requests)(invoiceId: String): ClientFailableOp[List[SubscriptionNumber]] = {
    requests.get[JsValue](s"invoices/$invoiceId/items").map { json =>
      invoiceItemsToSubscriptionsIds(json)
    }
  }

  private def invoiceItemsToSubscriptionsIds(json: JsValue): List[SubscriptionNumber] = {
    val parsed = (json \ "invoiceItems" \\ "subscriptionName")
      .map(_.as[String])
      .toSet
      .map(n => SubscriptionNumber(n))
    logger.info(s"invoice unique subscriptions ids: $parsed")
    parsed.toList
  }

}

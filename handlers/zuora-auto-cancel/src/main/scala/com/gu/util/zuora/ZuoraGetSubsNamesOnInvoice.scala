package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json.JsValue

final case class SubscriptionNumber(value: String)

trait GetSubscriptionsOnInvoice {
  def getSubscriptionsOnInvoice(invoiceId: String): ClientFailableOp[List[SubscriptionNumber]]
}

class ZuoraGetSubsNamesOnInvoice(requests: Requests) extends GetSubscriptionsOnInvoice with LazyLogging {
  override def getSubscriptionsOnInvoice(invoiceId: String): ClientFailableOp[List[SubscriptionNumber]] = {
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

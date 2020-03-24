package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.ZuoraGetAccountSummary.SubscriptionId
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json.JsValue

object ZuoraGetInvoiceItemsIds extends LazyLogging {

  def apply(requests: Requests)(invoiceId: String): ClientFailableOp[List[SubscriptionId]] = {
    requests.get[JsValue](s"invoices/$invoiceId/items").map { json =>
      invoiceItemsToSubscriptionsIds(json)
    }
  }

  private def invoiceItemsToSubscriptionsIds(json: JsValue): List[SubscriptionId] = {
    val parsed = (json \ "invoiceItems" \\ "subscriptionId")
      .map(_.as[String])
      .toSet
      .map(n => SubscriptionId(n))
    logger.info(s"invoice unique subscriptions ids: $parsed")
    parsed.toList
  }

}

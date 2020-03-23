package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json.JsValue

object ZuoraGetInvoiceItems extends LazyLogging {

  def apply(requests: Requests)(invoiceId: String): ClientFailableOp[JsValue] = {
    val rawJson = requests.get[JsValue](s"invoices/$invoiceId/items")
    val json: JsValue = rawJson.toDisjunction.right.get
    logger.info(s"ZuoraGetInvoiceItems rawJson: $rawJson")
    val parsed: Set[String] = (json \ "invoiceItems" \\ "subscriptionName").map(_.as[String]).toSet
    logger.info(s"ZuoraGetInvoiceItems parsed json: $parsed")
    rawJson
  }

}

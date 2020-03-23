package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.JsValue

object ZuoraGetInvoiceItems {

  def apply(requests: Requests)(invoiceId: String): ClientFailableOp[JsValue] =
    requests.get[JsValue](s"invoices/$invoiceId/items")

}

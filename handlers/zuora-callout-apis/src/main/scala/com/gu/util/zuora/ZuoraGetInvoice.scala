package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker.{Requests, WithoutCheck}
import com.gu.util.resthttp.Types.ClientFailableOp
import play.api.libs.json.{Json, Reads}

object ZuoraGetInvoice {
  private case class Invoice(id: String)

  private implicit val invoiceReads: Reads[Invoice] = Json.reads[Invoice]

  /** https://developer.zuora.com/v1-api-reference/api/invoices/get_getinvoice */
  def apply(requests: Requests)(invoiceNumber: String): ClientFailableOp[String] =
    requests.get[Invoice](s"invoices/$invoiceNumber", WithoutCheck).map(_.id)
}

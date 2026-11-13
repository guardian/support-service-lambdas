package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker.{Requests, WithoutCheck}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import play.api.libs.json.{Json, Reads}

object ZuoraGetInvoice {
  private case class Invoice(id: String)

  private implicit val invoiceReads: Reads[Invoice] = Json.reads[Invoice]

  def apply(requests: Requests)(invoiceNumber: String): ClientFailableOp[String] =
    for {
      invoice <- requests.get[Invoice](s"invoices/$invoiceNumber", WithoutCheck)
      invoiceId <-
        if (invoice.id.trim.nonEmpty) ClientSuccess(invoice.id)
        else GenericError(s"Zuora returned an empty invoice ID for invoice $invoiceNumber")
    } yield invoiceId
}

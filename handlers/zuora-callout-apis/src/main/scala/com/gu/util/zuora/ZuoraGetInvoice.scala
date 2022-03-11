package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker.{Requests, WithoutCheck}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json.{Json, Reads}

object ZuoraGetInvoice extends LazyLogging {

  case class Invoice(Id: String, Balance: Double)

  implicit val invoiceReads: Reads[Invoice] = Json.reads[Invoice]

  def apply(requests: Requests)(invoiceId: String): ClientFailableOp[Invoice] =
    requests.get[Invoice](s"object/invoice/$invoiceId?fields=Balance", WithoutCheck)

  def dryRun(requests: Requests)(invoiceId: String): ClientFailableOp[Invoice] = {
    val msg = s"DryRun for ZuoraGetInvoice: ID $invoiceId"
    logger.info(msg)
    ClientSuccess(Invoice(Id = "invoiceId", Balance = 0))
  }
}

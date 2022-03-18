package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.functional.syntax._
import play.api.libs.json.{JsPath, Reads}

import java.time.LocalDate

object ZuoraGetInvoiceTransactions extends LazyLogging {

  case class InvoiceItem(id: String, subscriptionName: String, serviceStartDate: LocalDate, serviceEndDate: LocalDate, chargeAmount: Double, chargeName: String, productName: String)

  case class ItemisedInvoice(id: String, invoiceDate: LocalDate, amount: Double, balance: Double, status: String, invoiceItems: List[InvoiceItem])

  case class InvoiceTransactionSummary(invoices: List[ItemisedInvoice])

  implicit val invoiceItemReads: Reads[InvoiceItem] = (
    (JsPath \ "id").read[String] and
    (JsPath \ "subscriptionName").read[String] and
    (JsPath \ "serviceStartDate").read[LocalDate] and
    (JsPath \ "serviceEndDate").read[LocalDate] and
    (JsPath \ "chargeAmount").read[Double] and
    (JsPath \ "chargeName").read[String] and
    (JsPath \ "productName").read[String]
  )(InvoiceItem.apply _)

  implicit val itemisedInvoiceReads: Reads[ItemisedInvoice] = (
    (JsPath \ "id").read[String] and
    (JsPath \ "invoiceDate").read[LocalDate] and
    (JsPath \ "amount").read[Double] and
    (JsPath \ "balance").read[Double] and
    (JsPath \ "status").read[String] and
    (JsPath \ "invoiceItems").read[List[InvoiceItem]]
  )(ItemisedInvoice.apply _)

  implicit val invoiceTransactionSummaryReads: Reads[InvoiceTransactionSummary] =
    (JsPath \ "invoices").read[List[ItemisedInvoice]].map {
      invoices => InvoiceTransactionSummary(invoices)
    }

  def apply(requests: Requests)(accountId: String): ClientFailableOp[InvoiceTransactionSummary] =
    requests.get[InvoiceTransactionSummary](s"transactions/invoices/accounts/$accountId")

  def dryRun(requests: Requests)(accountId: String): ClientFailableOp[InvoiceTransactionSummary] = {
    val msg = s"DryRun for ZuoraGetInvoiceTransactions: ID $accountId"
    logger.info(msg)
    ClientSuccess(InvoiceTransactionSummary(invoices = Nil))
  }
}

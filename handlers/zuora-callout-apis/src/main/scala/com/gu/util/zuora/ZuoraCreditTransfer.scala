package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, ClientSuccess}
import com.gu.util.zuora.ZuoraCreditTransfer.AdjustmentType
import com.gu.util.zuora.ZuoraGetAccountSummary.Invoice
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json._

object ZuoraCreditTransfer extends LazyLogging {

  sealed abstract class AdjustmentType(val value: String)
  object AdjustmentType {
    case object Increase extends AdjustmentType("Increase")
    case object Decrease extends AdjustmentType("Decrease")
  }

  case class CreditTransfer(
    invoiceId: String,
    amount: BigDecimal,
    adjustmentType: AdjustmentType,
    comment: String
  )

  implicit val transferWrites = new Writes[CreditTransfer] {
    def writes(transfer: CreditTransfer) = Json.obj(
      "SourceTransactionId" -> transfer.invoiceId,
      "Amount" -> transfer.amount,
      "Type" -> transfer.adjustmentType.value,
      "Comment" -> transfer.comment
    )
  }

  def toBodyAndPath(invoiceId: String, amount: BigDecimal, adjustmentType: AdjustmentType, comment: String) =
    (CreditTransfer(invoiceId, amount, adjustmentType, comment), "object/credit-balance-adjustment")
}

object TransferToCreditBalance extends LazyLogging {

  implicit val unitReads: Reads[Unit] =
    Reads(_ => JsSuccess(()))

  def apply(requests: Requests)(invoiceId: String, amount: BigDecimal, comment: String): ClientFailableOp[Unit] = {
    val (body, path) = ZuoraCreditTransfer.toBodyAndPath(invoiceId, amount, AdjustmentType.Increase, comment)
    requests.post(body, path)
  }

  def dryRun(requests: Requests)(invoiceId: String, amount: BigDecimal, comment: String): ClientFailableOp[Unit] = {
    val (body, path) = ZuoraCreditTransfer.toBodyAndPath(invoiceId, amount, AdjustmentType.Increase, comment)
    val msg = s"DryRun for ZuoraCreditTransfer: body=$body, path=$path"
    logger.info(msg)
    ClientSuccess(())
  }
}

object ApplyCreditBalance extends LazyLogging {

  implicit val unitReads: Reads[Unit] =
    Reads(_ => JsSuccess(()))

  def apply(requests: Requests)(invoices: Seq[Invoice], comment: String): ClientFailableOp[Unit] =
    invoices.map(invoice =>
      applyToInvoice(requests)(invoice.id, invoice.balance, comment)).collectFirst { case failure: ClientFailure => failure }
      .getOrElse(ClientSuccess(()))

  private def applyToInvoice(requests: Requests)(invoiceId: String, amount: Double, comment: String): ClientFailableOp[Unit] = {
    val (body, path) = ZuoraCreditTransfer.toBodyAndPath(invoiceId, amount, AdjustmentType.Decrease, comment)
    requests.post(body, path)
  }

  def dryRun(requests: Requests)(invoices: Seq[Invoice], comment: String): ClientFailableOp[Unit] = {
    invoices.foreach(invoice =>
      dryRunOnInvoice(requests)(invoice.id, invoice.balance, comment))
    ClientSuccess(())
  }

  private def dryRunOnInvoice(requests: Requests)(invoiceId: String, amount: Double, comment: String): ClientFailableOp[Unit] = {
    val (body, path) = ZuoraCreditTransfer.toBodyAndPath(invoiceId, amount, AdjustmentType.Decrease, comment)
    val msg = s"DryRun for ZuoraCreditTransfer: body=$body, path=$path"
    logger.info(msg)
    ClientSuccess(())
  }
}

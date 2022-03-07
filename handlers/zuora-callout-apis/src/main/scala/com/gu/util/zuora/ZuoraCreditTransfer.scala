package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess}
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json._

object ZuoraCreditTransfer extends LazyLogging {

  case class CreditTransfer(
    invoiceId: String,
    amount: BigDecimal,
    increase: Boolean,
    comment: String
  )

  implicit val transferWrites = new Writes[CreditTransfer] {
    def writes(transfer: CreditTransfer) = Json.obj(
      "sourceTransactionId" -> transfer.invoiceId,
      "amount" -> transfer.amount,
      "type" -> { if (transfer.increase) "Increase" else "Decrease" },
      "comment" -> transfer.comment
    )
  }

  def toBodyAndPath(invoiceId: String, amount: BigDecimal, increase: Boolean, comment: String) =
    (CreditTransfer(invoiceId, amount, increase, comment), "object/credit-balance-adjustment")
}

object TransferToCreditBalance extends LazyLogging {

  implicit val unitReads: Reads[Unit] =
    Reads(_ => JsSuccess(()))

  def apply(requests: Requests)(invoiceId: String, amount: BigDecimal, comment: String): ClientFailableOp[Unit] = {
    val (body, path) = ZuoraCreditTransfer.toBodyAndPath(invoiceId, amount, increase = true, comment)
    requests.put(body, path)
  }

  def dryRun(requests: Requests)(invoiceId: String, amount: BigDecimal, comment: String): ClientFailableOp[Unit] = {
    val (body, path) = ZuoraCreditTransfer.toBodyAndPath(invoiceId, amount, increase = true, comment)
    val msg = s"DryRun for ZuoraCreditTransfer: body=$body, path=$path"
    logger.info(msg)
    ClientSuccess(JsNull)
  }
}

object ApplyCreditBalance extends LazyLogging {

  implicit val unitReads: Reads[Unit] =
    Reads(_ => JsSuccess(()))

  def apply(requests: Requests)(invoiceId: String, amount: BigDecimal, comment: String): ClientFailableOp[Unit] = {
    val (body, path) = ZuoraCreditTransfer.toBodyAndPath(invoiceId, amount, increase = false, comment)
    requests.put(body, path)
  }

  def dryRun(requests: Requests)(invoiceId: String, amount: BigDecimal, comment: String): ClientFailableOp[Unit] = {
    val (body, path) = ZuoraCreditTransfer.toBodyAndPath(invoiceId, amount, increase = false, comment)
    val msg = s"DryRun for ZuoraCreditTransfer: body=$body, path=$path"
    logger.info(msg)
    ClientSuccess(JsNull)
  }
}

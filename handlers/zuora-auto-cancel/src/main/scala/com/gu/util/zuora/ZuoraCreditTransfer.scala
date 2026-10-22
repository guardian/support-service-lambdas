package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.ZuoraCreditTransfer.AdjustmentType
import play.api.libs.json._

object ZuoraCreditTransfer {
  sealed abstract class AdjustmentType(val value: String)
  object AdjustmentType {
    case object Increase extends AdjustmentType("Increase")
    case object Decrease extends AdjustmentType("Decrease")
  }

  case class CreditTransfer(
      invoiceId: String,
      amount: BigDecimal,
      adjustmentType: AdjustmentType,
      comment: String,
  )

  implicit val transferWrites: Writes[CreditTransfer] = new Writes[CreditTransfer] {
    def writes(transfer: CreditTransfer): JsValue = Json.obj(
      "SourceTransactionId" -> transfer.invoiceId,
      "Amount" -> transfer.amount,
      "Type" -> transfer.adjustmentType.value,
      "Comment" -> transfer.comment,
    )
  }

  def toBodyAndPath(invoiceId: String, amount: BigDecimal, adjustmentType: AdjustmentType, comment: String) =
    (CreditTransfer(invoiceId, amount, adjustmentType, comment), "object/credit-balance-adjustment")
}

trait CreditBalanceTransfer {
  def transferToCreditBalance(invoiceId: String, amount: BigDecimal, comment: String): ClientFailableOp[Unit]
}

class TransferToCreditBalance(requests: Requests) extends CreditBalanceTransfer {
  private implicit val unitReads: Reads[Unit] = Reads(_ => JsSuccess(()))

  override def transferToCreditBalance(
      invoiceId: String,
      amount: BigDecimal,
      comment: String,
  ): ClientFailableOp[Unit] = {
    val (body, path) = ZuoraCreditTransfer.toBodyAndPath(invoiceId, amount, AdjustmentType.Increase, comment)
    requests.post[ZuoraCreditTransfer.CreditTransfer, Unit](body, path)
  }
}

trait CreditBalanceApplication {
  def applyCreditBalance(invoiceId: String, amount: Double, comment: String): ClientFailableOp[Unit]
}

class ApplyCreditBalance(requests: Requests) extends CreditBalanceApplication {
  private implicit val unitReads: Reads[Unit] = Reads(_ => JsSuccess(()))

  override def applyCreditBalance(invoiceId: String, amount: Double, comment: String): ClientFailableOp[Unit] = {
    val (body, path) = ZuoraCreditTransfer.toBodyAndPath(invoiceId, amount, AdjustmentType.Decrease, comment)
    requests.post[ZuoraCreditTransfer.CreditTransfer, Unit](body, path)
  }
}

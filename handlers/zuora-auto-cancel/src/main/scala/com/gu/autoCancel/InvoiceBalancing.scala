package com.gu.autoCancel

import com.gu.autoCancel.AutoCancel._
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora._

trait InvoiceBalancing {
  def balance(cancellations: List[CancelledSubscription]): ClientFailableOp[Unit]
}

object InvoiceBalancing {
  def apply(requests: Requests): InvoiceBalancing =
    new ZuoraInvoiceBalancing(
      new ZuoraGetInvoiceTransactions(requests),
      new TransferToCreditBalance(requests),
      new ApplyCreditBalance(requests),
    )
}

class ZuoraInvoiceBalancing(
    invoiceTransactions: GetInvoiceTransactions,
    creditTransfer: CreditBalanceTransfer,
    creditApplication: CreditBalanceApplication,
) extends InvoiceBalancing {

  override def balance(cancellations: List[CancelledSubscription]): ClientFailableOp[Unit] =
    attemptAll(cancellations) { cancelled =>
      balanceInvoices(cancelled.request, cancelled.response)
        .withLogging(s"balance ${cancelled.request.subToCancel.value}, invoice ${cancelled.response.invoiceId}")
    }.map(_ => ())

  private def balanceInvoices(
      request: AutoCancelRequest,
      cancellationResponse: CancellationResponse,
  ): ClientFailableOp[Unit] = {
    val AutoCancelRequest(accountId, subToCancel, _) = request
    for {
      invoiceTransactionSummary <- invoiceTransactions.getInvoiceTransactions(accountId)
      unbalancedInvoices <- UnbalancedInvoices.fromSummary(
        accountId,
        invoiceTransactionSummary,
        cancellationResponse.invoiceId,
      )
      creditTransferAmount = -unbalancedInvoices.negativeInvoice.balance
      _ <- creditTransfer
        .transferToCreditBalance(cancellationResponse.invoiceId, creditTransferAmount, "Auto-cancellation")
        .withLogging("transferToCreditBalance")
      _ <- applyCreditBalances(creditApplication)(
        subToCancel,
        unbalancedInvoices.unpaidInvoices,
        "Auto-cancellation",
      ).withLogging("applyCreditBalance")
    } yield ()
  }
}

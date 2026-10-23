package com.gu.autoCancel

import com.gu.util.TypeConvert.TypeConvertClientOp
import com.gu.util.email.{EmailId, EmailSender}
import com.gu.util.resthttp.Types.{ClientFailableOp, GenericError}
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.zuora.{GetInvoiceTransactions, ZuoraGetInvoiceTransactions}

trait CancellationEmail {
  def sendCancellationEmail(callout: AutoCancelCallout): ClientFailableOp[Unit]
}

object ZuoraEmailSteps {
  def apply(requests: Requests, emailSender: EmailSender): CancellationEmail =
    new ZuoraEmailSteps(emailSender, new ZuoraGetInvoiceTransactions(requests))
}

class ZuoraEmailSteps(
    emailSender: EmailSender,
    invoiceTransactions: GetInvoiceTransactions,
) extends CancellationEmail {

  override def sendCancellationEmail(callout: AutoCancelCallout): ClientFailableOp[Unit] = {
    for {
      invoiceTransactionSummary <- invoiceTransactions.getInvoiceTransactions(callout.accountId)
      paymentInformation <- GetPaymentData(callout.accountId)(invoiceTransactionSummary).left
        .map(GenericError(_))
        .toClientFailableOp
      message <- ToMessage(callout, paymentInformation, EmailId.cancelledId).left
        .map(GenericError(_))
        .toClientFailableOp
      _ <- emailSender
        .send(message)
        .withAmendedError(oldError =>
          GenericError(s"email not sent for account ${callout.accountId}, error: ${oldError.message}"),
        )
    } yield ()
  }
}

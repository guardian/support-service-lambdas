package com.gu.autoCancel

import com.gu.autoCancel.GetPaymentData.PaymentFailureInformation
import com.gu.util.TypeConvert.TypeConvertClientOp
import com.gu.util.email.EmailMessage
import com.gu.util.resthttp.Types.{ClientFailableOp, GenericError}
import com.gu.util.zuora.ZuoraGetInvoiceTransactions.InvoiceTransactionSummary

class ZuoraEmailSteps(
    sendEmail: EmailMessage => ClientFailableOp[Unit],
    getInvoiceTransactions: String => ClientFailableOp[InvoiceTransactionSummary],
) {

  def sendEmailRegardingAccount(
      accountId: String,
      toMessage: PaymentFailureInformation => Either[String, EmailMessage],
  ): ClientFailableOp[Unit] = {
    for {
      invoiceTransactionSummary <- getInvoiceTransactions(accountId)
      paymentInformation <- GetPaymentData(accountId)(invoiceTransactionSummary).left
        .map(GenericError(_))
        .toClientFailableOp
      message <- toMessage(paymentInformation).left.map(GenericError(_)).toClientFailableOp
      _ <- sendEmail(message).withAmendedError(oldError =>
        GenericError(s"email not sent for account ${accountId}, error: ${oldError.message}"),
      )
    } yield ()
  }
}

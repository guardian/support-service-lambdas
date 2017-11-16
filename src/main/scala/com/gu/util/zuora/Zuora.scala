package com.gu.util.zuora

import com.gu.util.reader.Types.all
import com.gu.util.zuora.ZuoraModels._
import com.gu.util.zuora.ZuoraReaders._
import com.gu.util.zuora.ZuoraWriters._
import org.joda.time.LocalDate
object Zuora {

  import ZuoraRestRequestMaker._

  type GetAccountSummary = String => all#ImpureFunctionsFailableOp[AccountSummary]

  def getAccountSummary: GetAccountSummary = (accountId: String) =>
    get[AccountSummary](s"accounts/$accountId/summary")

  type GetInvoiceTransactions = String => all#ImpureFunctionsFailableOp[InvoiceTransactionSummary]

  def getInvoiceTransactions: GetInvoiceTransactions = (accountId: String) =>
    get[InvoiceTransactionSummary](s"transactions/invoices/accounts/$accountId")

  type CancelSubscription = (SubscriptionSummary, LocalDate) => all#ImpureFunctionsFailableOp[CancelSubscriptionResult]

  def cancelSubscription(subscription: SubscriptionSummary, cancellationDate: LocalDate): all#ImpureFunctionsFailableOp[CancelSubscriptionResult] =
    put(SubscriptionCancellation(cancellationDate), s"subscriptions/${subscription.id}/cancel")

  type UpdateCancellationReason = SubscriptionSummary => all#ImpureFunctionsFailableOp[UpdateSubscriptionResult]

  def updateCancellationReason(subscription: SubscriptionSummary): all#ImpureFunctionsFailableOp[UpdateSubscriptionResult] =
    put(SubscriptionUpdate("System AutoCancel"), s"subscriptions/${subscription.id}")

  type DisableAutoPay = String => all#ImpureFunctionsFailableOp[UpdateAccountResult]

  def disableAutoPay(accountId: String): all#ImpureFunctionsFailableOp[UpdateAccountResult] =
    put(AccountUpdate(autoPay = false), s"accounts/$accountId")

}


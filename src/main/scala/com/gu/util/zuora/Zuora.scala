package com.gu.util.zuora

import com.gu.util.reader.Types.ConfigHttpFailableOp
import com.gu.util.zuora.ZuoraModels._
import com.gu.util.zuora.ZuoraReaders._
import com.gu.util.zuora.ZuoraWriters._
import org.joda.time.LocalDate

object Zuora {

  import ZuoraRestRequestMaker._

  type GetAccountSummary = String => ConfigHttpFailableOp[AccountSummary]

  def getAccountSummary: GetAccountSummary = (accountId: String) =>
    get[AccountSummary](s"accounts/$accountId/summary")

  type GetInvoiceTransactions = String => ConfigHttpFailableOp[InvoiceTransactionSummary]

  def getInvoiceTransactions: GetInvoiceTransactions = (accountId: String) =>
    get[InvoiceTransactionSummary](s"transactions/invoices/accounts/$accountId")

  type CancelSubscription = (SubscriptionSummary, LocalDate) => ConfigHttpFailableOp[CancelSubscriptionResult]

  def cancelSubscription(subscription: SubscriptionSummary, cancellationDate: LocalDate): ConfigHttpFailableOp[CancelSubscriptionResult] =
    put(SubscriptionCancellation(cancellationDate), s"subscriptions/${subscription.id}/cancel")

  type UpdateCancellationReason = SubscriptionSummary => ConfigHttpFailableOp[UpdateSubscriptionResult]

  def updateCancellationReason(subscription: SubscriptionSummary): ConfigHttpFailableOp[UpdateSubscriptionResult] =
    put(SubscriptionUpdate("System AutoCancel"), s"subscriptions/${subscription.id}")

  type DisableAutoPay = String => ConfigHttpFailableOp[UpdateAccountResult]

  def disableAutoPay(accountId: String): ConfigHttpFailableOp[UpdateAccountResult] =
    put(AccountUpdate(autoPay = false), s"accounts/$accountId")

}


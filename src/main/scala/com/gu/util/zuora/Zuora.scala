package com.gu.util.zuora

import com.gu.util.zuora.Types.ZuoraOp
import com.gu.util.zuora.ZuoraModels._
import com.gu.util.zuora.ZuoraReaders._
import com.gu.util.zuora.ZuoraWriters._
import org.joda.time.LocalDate

object Zuora {

  import ZuoraRestRequestMaker._

  type GetAccountSummary = String => ZuoraOp[AccountSummary]

  def getAccountSummary: GetAccountSummary = (accountId: String) =>
    get[AccountSummary](s"accounts/$accountId/summary")

  type GetInvoiceTransactions = String => ZuoraOp[InvoiceTransactionSummary]

  def getInvoiceTransactions: GetInvoiceTransactions = (accountId: String) =>
    get[InvoiceTransactionSummary](s"transactions/invoices/accounts/$accountId")

  def cancelSubscription(subscription: SubscriptionSummary, cancellationDate: LocalDate): ZuoraOp[CancelSubscriptionResult] =
    put(SubscriptionCancellation(cancellationDate), s"subscriptions/${subscription.id}/cancel")

  def updateCancellationReason(subscription: SubscriptionSummary): ZuoraOp[UpdateSubscriptionResult] =
    put(SubscriptionUpdate("System AutoCancel"), s"subscriptions/${subscription.id}")

  def disableAutoPay(accountId: String): ZuoraOp[UpdateAccountResult] =
    put(AccountUpdate(autoPay = false), s"accounts/${accountId}")

}


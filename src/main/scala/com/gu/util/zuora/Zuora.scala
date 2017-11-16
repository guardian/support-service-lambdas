package com.gu.util.zuora

import com.gu.util.apigateway.ApiGatewayHandler.StageAndConfigHttp
import com.gu.util.reader.Types.WithDeps
import com.gu.util.zuora.ZuoraModels._
import com.gu.util.zuora.ZuoraReaders._
import com.gu.util.zuora.ZuoraWriters._
import org.joda.time.LocalDate
object Zuora {

  import ZuoraRestRequestMaker._

  type GetAccountSummary = String => WithDeps[StageAndConfigHttp]#FailableOp[AccountSummary]

  def getAccountSummary: GetAccountSummary = (accountId: String) =>
    get[AccountSummary](s"accounts/$accountId/summary")

  type GetInvoiceTransactions = String => WithDeps[StageAndConfigHttp]#FailableOp[InvoiceTransactionSummary]

  def getInvoiceTransactions: GetInvoiceTransactions = (accountId: String) =>
    get[InvoiceTransactionSummary](s"transactions/invoices/accounts/$accountId")

  type CancelSubscription = (SubscriptionSummary, LocalDate) => WithDeps[StageAndConfigHttp]#FailableOp[CancelSubscriptionResult]

  def cancelSubscription(subscription: SubscriptionSummary, cancellationDate: LocalDate): WithDeps[StageAndConfigHttp]#FailableOp[CancelSubscriptionResult] =
    put(SubscriptionCancellation(cancellationDate), s"subscriptions/${subscription.id}/cancel")

  type UpdateCancellationReason = SubscriptionSummary => WithDeps[StageAndConfigHttp]#FailableOp[UpdateSubscriptionResult]

  def updateCancellationReason(subscription: SubscriptionSummary): WithDeps[StageAndConfigHttp]#FailableOp[UpdateSubscriptionResult] =
    put(SubscriptionUpdate("System AutoCancel"), s"subscriptions/${subscription.id}")

  type DisableAutoPay = String => WithDeps[StageAndConfigHttp]#FailableOp[UpdateAccountResult]

  def disableAutoPay(accountId: String): WithDeps[StageAndConfigHttp]#FailableOp[UpdateAccountResult] =
    put(AccountUpdate(autoPay = false), s"accounts/$accountId")

}


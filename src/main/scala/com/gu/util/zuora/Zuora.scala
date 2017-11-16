package com.gu.util.zuora

import com.gu.util.apigateway.ApiGatewayHandler.StageAndConfigHttp
import com.gu.util.reader.Types.{ WithDepsFailableOp }
import com.gu.util.zuora.ZuoraModels._
import com.gu.util.zuora.ZuoraReaders._
import com.gu.util.zuora.ZuoraWriters._
import org.joda.time.LocalDate
object Zuora {

  import ZuoraRestRequestMaker._

  type GetAccountSummary = String => WithDepsFailableOp[StageAndConfigHttp, AccountSummary]

  def getAccountSummary: GetAccountSummary = (accountId: String) =>
    get[AccountSummary](s"accounts/$accountId/summary")

  type GetInvoiceTransactions = String => WithDepsFailableOp[StageAndConfigHttp, InvoiceTransactionSummary]

  def getInvoiceTransactions: GetInvoiceTransactions = (accountId: String) =>
    get[InvoiceTransactionSummary](s"transactions/invoices/accounts/$accountId")

  type CancelSubscription = (SubscriptionSummary, LocalDate) => WithDepsFailableOp[StageAndConfigHttp, CancelSubscriptionResult]

  def cancelSubscription(subscription: SubscriptionSummary, cancellationDate: LocalDate): WithDepsFailableOp[StageAndConfigHttp, CancelSubscriptionResult] =
    put(SubscriptionCancellation(cancellationDate), s"subscriptions/${subscription.id}/cancel")

  type UpdateCancellationReason = SubscriptionSummary => WithDepsFailableOp[StageAndConfigHttp, UpdateSubscriptionResult]

  def updateCancellationReason(subscription: SubscriptionSummary): WithDepsFailableOp[StageAndConfigHttp, UpdateSubscriptionResult] =
    put(SubscriptionUpdate("System AutoCancel"), s"subscriptions/${subscription.id}")

  type DisableAutoPay = String => WithDepsFailableOp[StageAndConfigHttp, UpdateAccountResult]

  def disableAutoPay(accountId: String): WithDepsFailableOp[StageAndConfigHttp, UpdateAccountResult] =
    put(AccountUpdate(autoPay = false), s"accounts/$accountId")

}


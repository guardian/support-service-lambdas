package com.gu.util.zuora

import com.gu.util.apigateway.ApiGatewayHandler.StageAndConfigHttp
import com.gu.util.reader.Types.WithDepsFailableOp
import com.gu.util.zuora.ZuoraModels._
import com.gu.util.zuora.ZuoraReaders._
import com.gu.util.zuora.ZuoraWriters._
import org.joda.time.LocalDate
object Zuora {

  import ZuoraRestRequestMaker._

  def getAccountSummary(accountId: String): WithDepsFailableOp[StageAndConfigHttp, AccountSummary] =
    get[AccountSummary](s"accounts/$accountId/summary")

  def getInvoiceTransactions(accountId: String): WithDepsFailableOp[StageAndConfigHttp, InvoiceTransactionSummary] =
    get[InvoiceTransactionSummary](s"transactions/invoices/accounts/$accountId")

  def cancelSubscription(subscription: SubscriptionId, cancellationDate: LocalDate): WithDepsFailableOp[StageAndConfigHttp, Unit] =
    put(SubscriptionCancellation(cancellationDate), s"subscriptions/${subscription.id}/cancel")

  def updateCancellationReason(subscription: SubscriptionId): WithDepsFailableOp[StageAndConfigHttp, Unit] =
    put(SubscriptionUpdate("System AutoCancel"), s"subscriptions/${subscription.id}")

  def disableAutoPay(accountId: String): WithDepsFailableOp[StageAndConfigHttp, Unit] =
    put(AccountUpdate(autoPay = false), s"accounts/$accountId")

}


package com.gu.util.zuora

import com.gu.util.ZuoraRestConfig
import com.gu.util.reader.Types.WithDepsFailableOp
import com.gu.util.zuora.ZuoraModels._
import com.gu.util.zuora.ZuoraReaders._
import com.gu.util.zuora.ZuoraWriters._
import okhttp3.{ Request, Response }
import org.joda.time.LocalDate
object Zuora {

  import ZuoraRestRequestMaker._

  case class ZuoraDeps(response: Request => Response, config: ZuoraRestConfig)

  def getAccountSummary(accountId: String): WithDepsFailableOp[ZuoraDeps, AccountSummary] =
    get[AccountSummary](s"accounts/$accountId/summary")

  def getInvoiceTransactions(accountId: String): WithDepsFailableOp[ZuoraDeps, InvoiceTransactionSummary] =
    get[InvoiceTransactionSummary](s"transactions/invoices/accounts/$accountId")

  def cancelSubscription(subscription: SubscriptionId, cancellationDate: LocalDate): WithDepsFailableOp[ZuoraDeps, Unit] =
    put(SubscriptionCancellation(cancellationDate), s"subscriptions/${subscription.id}/cancel")

  def updateCancellationReason(subscription: SubscriptionId): WithDepsFailableOp[ZuoraDeps, Unit] =
    put(SubscriptionUpdate("System AutoCancel"), s"subscriptions/${subscription.id}")

  def disableAutoPay(accountId: String): WithDepsFailableOp[ZuoraDeps, Unit] =
    put(AccountUpdate(autoPay = false), s"accounts/$accountId")

}


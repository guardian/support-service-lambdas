package com.gu.autoCancel

import com.gu.autoCancel.AutoCancelSteps.AutoCancelUrlParams
import com.gu.stripeCustomerSourceUpdated.TypeConvert._
import com.gu.util.Logging
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, ClientSuccess, GenericError, NotFound}
import com.gu.util.zuora.ZuoraGetInvoiceTransactions.{InvoiceTransactionSummary, ItemisedInvoice}
import com.gu.util.zuora._

import java.time.LocalDate

object AutoCancel extends Logging {

  case class AutoCancelRequest(
    accountId: String,
    subToCancel: SubscriptionNumber,
    cancellationDate: LocalDate
  )

  def apply(requests: Requests)(acRequests: List[AutoCancelRequest], urlParams: AutoCancelUrlParams): ApiGatewayOp[Unit] = {
    logger.info(s"dryRun: ${urlParams.dryRun}")
    val ac = executeCancel(requests, urlParams.dryRun) _
    val responses = acRequests.map(cancelReq => ac(cancelReq))
    logger.info(s"AutoCancel responses: $responses")
    // TODO to refactor it should not call head
    responses.head
  }

  /*
   * This process applies at the subscription level.  It will potentially run multiple times per invoice.
   * The cancellation call generates a balancing invoice that should be negative and the same amount
   * as the amount outstanding for the invoice items corresponding to the subscription being processed
   * (there could be multiple invoice items per sub - it could include discounts and multi-day paper subs)
   * This means that after all subscriptions on an invoice have been cancelled, the balance of all
   * invoices should be 0.
   */
  private def executeCancel(requests: Requests, dryRun: Boolean)(acRequest: AutoCancelRequest): ApiGatewayOp[Unit] = {
    val AutoCancelRequest(accountId, subToCancel, cancellationDate) = acRequest
    logger.info(s"Attempting to perform auto-cancellation on account: $accountId for subscription: ${subToCancel.value}")
    val zuoraUpdateCancellationReasonF = if (dryRun) ZuoraUpdateCancellationReason.dryRun(requests) _ else ZuoraUpdateCancellationReason(requests) _
    val zuoraCancelSubscriptionF = if (dryRun) ZuoraCancelSubscription.dryRun(requests) _ else ZuoraCancelSubscription(requests) _
    val zuoraGetInvoiceTransactionsF = if (dryRun) ZuoraGetInvoiceTransactions.dryRun(requests) _ else ZuoraGetInvoiceTransactions(requests) _
    val zuoraTransferToCreditBalanceF = if (dryRun) TransferToCreditBalance.dryRun(requests) _ else TransferToCreditBalance(requests) _
    val zuoraApplyCreditBalanceF = if (dryRun) ApplyCreditBalance.dryRun(requests) _ else ApplyCreditBalance(requests) _
    val zuoraOp = for {
      _ <- zuoraUpdateCancellationReasonF(subToCancel).withLogging("updateCancellationReason")
      cancellationResponse <- zuoraCancelSubscriptionF(subToCancel, cancellationDate).withLogging("cancelSubscription")
      invoiceTransactionSummary <- zuoraGetInvoiceTransactionsF(accountId)
      unbalancedInvoices <- UnbalancedInvoices.fromSummary(accountId, invoiceTransactionSummary, cancellationResponse.invoiceId)
      creditTransferAmount = -unbalancedInvoices.negativeInvoice.balance
      _ <- zuoraTransferToCreditBalanceF(cancellationResponse.invoiceId, creditTransferAmount, "Auto-cancellation").withLogging("transferToCreditBalance")
      _ <- applyCreditBalances(zuoraApplyCreditBalanceF)(subToCancel, unbalancedInvoices.unpaidInvoices, "Auto-cancellation").withLogging("applyCreditBalance")
    } yield ()
    zuoraOp.toApiGatewayOp("AutoCancel failed")
  }

  private[autoCancel] def applyCreditBalances(applyCreditBalance: (String, Double, String) => ClientFailableOp[Unit])(
    subToCancel: SubscriptionNumber, invoices: Seq[ItemisedInvoice], comment: String
  ): ClientFailableOp[Unit] = {
    invoices.map(invoice =>
      invoice.invoiceItems.length match {
        case 0 => GenericError(s"Invoice ${invoice.id} has no items")
        case 1 => applyCreditBalance(invoice.id, invoice.balance, comment)
        case _ =>
          invoice.invoiceItems.find(_.subscriptionName == subToCancel.value) match {
            case None => GenericError(s"Invoice ${invoice.id} isn't for subscription $subToCancel")
            case Some(item) => applyCreditBalance(invoice.id, item.chargeAmount, comment)
          }
      }).collectFirst { case failure: ClientFailure => failure }.getOrElse(ClientSuccess(()))
  }

  case class UnbalancedInvoices(negativeInvoice: ItemisedInvoice, unpaidInvoices: Seq[ItemisedInvoice])

  object UnbalancedInvoices {
    def fromSummary(accountId: String, summary: InvoiceTransactionSummary, idOfNegativeInvoice: String): ClientFailableOp[UnbalancedInvoices] =
      for {
        negativeInvoice <- summary.invoices.find(_.id == idOfNegativeInvoice) match {
          case None => NotFound(s"No negative invoice in account $accountId")
          case Some(invoice) => ClientSuccess(invoice)
        }
        unpaidInvoices <- summary.invoices.filter(_.balance > 0) match {
          case Nil => NotFound(s"No unpaid invoices in account $accountId")
          case invoices => ClientSuccess(invoices)
        }
      } yield UnbalancedInvoices(negativeInvoice, unpaidInvoices)
  }
}

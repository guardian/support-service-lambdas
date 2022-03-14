package com.gu.autoCancel

import com.gu.autoCancel.AutoCancelSteps.AutoCancelUrlParams
import com.gu.stripeCustomerSourceUpdated.TypeConvert._
import com.gu.util.Logging
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, NotFound}
import com.gu.util.zuora.ZuoraGetAccountSummary.{AccountSummary, Invoice}
import com.gu.util.zuora._

import java.time.LocalDate

object AutoCancel extends Logging {

  case class AutoCancelRequest(
    accountId: String,
    subToCancel: SubscriptionNumber,
    cancellationDate: LocalDate,
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
    val zuoraGetAccountSummaryF = if (dryRun) ZuoraGetAccountSummary.dryRun(requests) _ else ZuoraGetAccountSummary(requests) _
    val zuoraTransferToCreditBalanceF = if (dryRun) TransferToCreditBalance.dryRun(requests) _ else TransferToCreditBalance(requests) _
    val zuoraApplyCreditBalanceF = if (dryRun) ApplyCreditBalance.dryRun(requests) _ else ApplyCreditBalance(requests) _
    val zuoraOp = for {
      _ <- zuoraUpdateCancellationReasonF(subToCancel).withLogging("updateCancellationReason")
      cancellationResponse <- zuoraCancelSubscriptionF(subToCancel, cancellationDate).withLogging("cancelSubscription")
      accountSummary <- zuoraGetAccountSummaryF(accountId)
      invoicesToBalance <- UnbalancedInvoices.fromAccountSummary(accountSummary)
      creditTransferAmount = -invoicesToBalance.negativeInvoice.balance
      _ <- zuoraTransferToCreditBalanceF(cancellationResponse.invoiceId, creditTransferAmount, "Auto-cancellation").withLogging("transferToCreditBalance")
      _ <- zuoraApplyCreditBalanceF(invoicesToBalance.unpaidInvoices, "Auto-cancellation").withLogging("applyCreditBalance")
    } yield ()
    zuoraOp.toApiGatewayOp("AutoCancel failed")
  }

  case class UnbalancedInvoices(negativeInvoice: Invoice, unpaidInvoices: Seq[Invoice])

  object UnbalancedInvoices {
    def fromAccountSummary(accountSummary: AccountSummary):ClientFailableOp[UnbalancedInvoices] =
      for {
        negativeInvoice <- accountSummary.invoices.find(_.balance < 0) match {
          case None => NotFound(s"No negative invoice in account ${ accountSummary.basicInfo.id }")
          case Some(invoice) => ClientSuccess(invoice)
        }
        unpaidInvoices <- accountSummary.invoices.filter(_.balance > 0) match {
           case Nil => NotFound(s"No unpaid invoices in account ${ accountSummary.basicInfo.id }")
           case invoices => ClientSuccess(invoices)
         }
      } yield UnbalancedInvoices(negativeInvoice,unpaidInvoices)
  }
}

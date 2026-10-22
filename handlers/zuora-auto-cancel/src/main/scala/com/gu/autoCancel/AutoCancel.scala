package com.gu.autoCancel

import com.gu.util.TypeConvert._
import com.gu.util.Logging
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, ClientSuccess, GenericError, NotFound}
import com.gu.util.zuora.ZuoraGetInvoiceTransactions.{InvoiceTransactionSummary, ItemisedInvoice}
import com.gu.util.zuora._

import java.time.LocalDate

object AutoCancel extends Logging {

  case class CancellationResponse(invoiceId: String)

  case class AutoCancelRequest(
      accountId: String,
      subToCancel: SubscriptionNumber,
      cancellationDate: LocalDate,
  )

  def apply(requests: Requests)(
      autoCancelRequests: List[AutoCancelRequest],
      calloutInvoiceId: String,
      orderDate: LocalDate,
  ): ApiGatewayOp[Unit] =
    apply(
      new ZuoraOrderCancellation(requests),
      new ZuoraGetInvoiceTransactions(requests),
      new TransferToCreditBalance(requests),
      new ApplyCreditBalance(requests),
      new ZuoraUpdateCancellationReason(requests),
    )(autoCancelRequests, calloutInvoiceId, orderDate)

  def apply(
      cancellation: SubscriptionCancellation,
      invoiceTransactions: GetInvoiceTransactions,
      creditTransfer: CreditBalanceTransfer,
      creditApplication: CreditBalanceApplication,
      cancellationReason: CancellationReasonUpdater,
  )(
      requests: List[AutoCancelRequest],
      calloutInvoiceId: String,
      orderDate: LocalDate,
  ): ApiGatewayOp[Unit] =
    attemptAll(requests)(request =>
      executeCancel(cancellation, invoiceTransactions, creditTransfer, creditApplication, cancellationReason)(
        request,
        calloutInvoiceId,
        orderDate,
      ),
    ).toApiGatewayOp("AutoCancel failed")

  private[autoCancel] def attemptAll[A, B](
      items: Seq[A],
  )(execute: A => ClientFailableOp[B]): ClientFailableOp[Unit] =
    items.foldLeft[ClientFailableOp[Unit]](ClientSuccess(())) { (firstResult, item) =>
      val currentResult = execute(item)
      firstResult match {
        case failure: ClientFailure => failure
        case ClientSuccess(_) => currentResult.map(_ => ())
      }
    }

  /*
   * This process applies at the subscription level.  It will potentially run multiple times per invoice.
   * The cancellation call generates a balancing invoice that should be negative and the same amount
   * as the amount outstanding for the invoice items corresponding to the subscription being processed
   * (there could be multiple invoice items per sub - it could include discounts and multi-day paper subs)
   * This means that after all subscriptions on an invoice have been cancelled, the balance of all
   * invoices should be 0.
   */
  private def executeCancel(
      cancellation: SubscriptionCancellation,
      invoiceTransactions: GetInvoiceTransactions,
      creditTransfer: CreditBalanceTransfer,
      creditApplication: CreditBalanceApplication,
      cancellationReason: CancellationReasonUpdater,
  )(
      request: AutoCancelRequest,
      calloutInvoiceId: String,
      orderDate: LocalDate,
  ): ClientFailableOp[Unit] = {
    val AutoCancelRequest(accountId, subToCancel, _) = request
    logger.info(
      s"Attempting to perform auto-cancellation on account: $accountId for subscription: ${subToCancel.value}",
    )
    for {
      _ <- cancellationReason.update(subToCancel).withLogging("updateCancellationReason")
      cancellationResponse <- cancellation
        .cancel(request, calloutInvoiceId, orderDate)
        .withLogging("cancelSubscription")
      invoiceTransactionSummary <- invoiceTransactions.getInvoiceTransactions(accountId)
      unbalancedInvoices <- UnbalancedInvoices.fromSummary(
        accountId,
        invoiceTransactionSummary,
        cancellationResponse.invoiceId,
      )
      creditTransferAmount = -unbalancedInvoices.negativeInvoice.balance
      _ <- creditTransfer
        .transferToCreditBalance(cancellationResponse.invoiceId, creditTransferAmount, "Auto-cancellation")
        .withLogging("transferToCreditBalance")
      _ <- applyCreditBalances(creditApplication.applyCreditBalance)(
        subToCancel,
        unbalancedInvoices.unpaidInvoices,
        "Auto-cancellation",
      ).withLogging("applyCreditBalance")
    } yield ()
  }

  private[autoCancel] def applyCreditBalances(applyCreditBalance: (String, Double, String) => ClientFailableOp[Unit])(
      subToCancel: SubscriptionNumber,
      invoices: Seq[ItemisedInvoice],
      comment: String,
  ): ClientFailableOp[Unit] = {
    attemptAll(invoices) { invoice =>
      invoice.invoiceItems.length match {
        case 0 => GenericError(s"Invoice ${invoice.id} has no items")
        case 1 => applyCreditBalance(invoice.id, invoice.balance, comment)
        case _ =>
          invoice.invoiceItems.filter(_.subscriptionName == subToCancel.value) match {
            case Nil => GenericError(s"Invoice ${invoice.id} isn't for subscription $subToCancel")
            case items =>
              val amount = items.map(item => item.chargeAmount + item.taxAmount).sum
              applyCreditBalance(invoice.id, amount, comment)
          }
      }
    }
  }

  case class UnbalancedInvoices(negativeInvoice: ItemisedInvoice, unpaidInvoices: Seq[ItemisedInvoice])

  object UnbalancedInvoices {
    def fromSummary(
        accountId: String,
        summary: InvoiceTransactionSummary,
        idOfNegativeInvoice: String,
    ): ClientFailableOp[UnbalancedInvoices] =
      for {
        negativeInvoice <- summary.invoices.find(_.id == idOfNegativeInvoice) match {
          case None => NotFound(s"No negative invoice in account $accountId", "")
          case Some(invoice) => ClientSuccess(invoice)
        }
        unpaidInvoices <- summary.invoices.filter(_.balance > 0) match {
          case Nil => NotFound(s"No unpaid invoices in account $accountId", "")
          case invoices => ClientSuccess(invoices)
        }
      } yield UnbalancedInvoices(negativeInvoice, unpaidInvoices)
  }
}

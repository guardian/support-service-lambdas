package com.gu.autoCancel

import com.gu.util.Logging
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, ClientSuccess, GenericError, NotFound}
import com.gu.util.zuora.ZuoraGetInvoiceTransactions.{InvoiceTransactionSummary, ItemisedInvoice}
import com.gu.util.zuora._

import java.time.LocalDate

object AutoCancel extends Logging {

  case class CancellationResponse(invoiceId: String, orderNumber: OrderNumber)

  case class CancelledSubscription(request: AutoCancelRequest, response: CancellationResponse)

  case class AutoCancelRequest(
      accountId: String,
      subToCancel: SubscriptionNumber,
      cancellationDate: LocalDate,
  )

  def apply(requests: Requests)(
      autoCancelRequests: List[AutoCancelRequest],
      calloutInvoiceId: String,
      orderDate: LocalDate,
  ): ClientFailableOp[List[CancelledSubscription]] =
    apply(
      new ZuoraOrderCancellation(requests),
      new ZuoraUpdateCancellationReason(requests),
    )(autoCancelRequests, calloutInvoiceId, orderDate)

  def apply(
      cancellation: SubscriptionCancellation,
      cancellationReason: CancellationReasonUpdater,
  )(
      requests: List[AutoCancelRequest],
      calloutInvoiceId: String,
      orderDate: LocalDate,
  ): ClientFailableOp[List[CancelledSubscription]] =
    attemptAll(requests) { request =>
      executeCancel(cancellation, cancellationReason)(request, calloutInvoiceId, orderDate)
        .map(CancelledSubscription(request, _))
    }

  private[autoCancel] def attemptAll[A, B](
      items: Seq[A],
  )(execute: A => ClientFailableOp[B]): ClientFailableOp[List[B]] =
    items
      .foldLeft[ClientFailableOp[List[B]]](ClientSuccess(Nil)) { (firstResult, item) =>
        val currentResult = execute(item)
        firstResult match {
          case failure: ClientFailure => failure
          case ClientSuccess(values) => currentResult.map(_ :: values)
        }
      }
      .map(_.reverse)

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
      cancellationReason: CancellationReasonUpdater,
  )(
      request: AutoCancelRequest,
      calloutInvoiceId: String,
      orderDate: LocalDate,
  ): ClientFailableOp[CancellationResponse] = {
    val AutoCancelRequest(accountId, subToCancel, _) = request
    logger.info(
      s"Attempting to perform auto-cancellation on account: $accountId for subscription: ${subToCancel.value}",
    )
    for {
      _ <- cancellationReason.update(subToCancel).withLogging("updateCancellationReason")
      cancellationResponse <- cancellation
        .cancel(request, calloutInvoiceId, orderDate)
        .withLogging("cancelSubscription")
    } yield cancellationResponse
  }

  private[autoCancel] def applyCreditBalances(creditApplication: CreditBalanceApplication)(
      subToCancel: SubscriptionNumber,
      invoices: Seq[ItemisedInvoice],
      comment: String,
  ): ClientFailableOp[Unit] = {
    attemptAll(invoices) { invoice =>
      invoice.invoiceItems.length match {
        case 0 => GenericError(s"Invoice ${invoice.id} has no items")
        case 1 => creditApplication.applyCreditBalance(invoice.id, invoice.balance, comment)
        case _ =>
          invoice.invoiceItems.filter(_.subscriptionName == subToCancel.value) match {
            case Nil => GenericError(s"Invoice ${invoice.id} isn't for subscription $subToCancel")
            case items =>
              val amount = items.map(item => item.chargeAmount + item.taxAmount).sum
              creditApplication.applyCreditBalance(invoice.id, amount, comment)
          }
      }
    }.map(_ => ())
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

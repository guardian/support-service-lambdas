package com.gu.autoCancel

import com.gu.autoCancel.AutoCancelSteps.AutoCancelUrlParams
import com.gu.util.TypeConvert._
import com.gu.util.Logging
import com.gu.util.reader.Types._
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientFailure, ClientSuccess, GenericError, NotFound}
import com.gu.util.zuora.ZuoraGetInvoiceTransactions.{InvoiceTransactionSummary, ItemisedInvoice}
import com.gu.util.zuora._
import com.gu.zuora.orders.CreateOrderRequest
import com.gu.zuora.{AccessToken, HolidayStopProcessorZuoraConfig, Zuora, ZuoraOrders}
import sttp.client3.{Identity, SttpBackend}

import java.time.LocalDate
import scala.concurrent.duration.{DurationInt, FiniteDuration}

object AutoCancel extends Logging {

  private val PostOrderWorkBuffer = 2.minutes
  private val MinimumOrderDuration = 10.seconds

  case class AutoCancelRequest(
      accountId: String,
      subToCancel: SubscriptionNumber,
      cancellationDate: LocalDate,
  )

  def apply(
      requests: Requests,
      ordersConfig: HolidayStopProcessorZuoraConfig,
      ordersBackend: SttpBackend[Identity, Any],
      getRemainingTimeInMillis: () => Int,
      orderDate: LocalDate,
  )(acRequests: List[AutoCancelRequest], urlParams: AutoCancelUrlParams): ApiGatewayOp[Unit] = {
    logger.info(s"dryRun: ${urlParams.dryRun}")
    val cancellation: ClientFailableOp[
      AutoCancelRequest => ClientFailableOp[ZuoraCancelSubscription.CancellationResponse],
    ] =
      if (urlParams.dryRun) ClientSuccess(legacyCancellation(requests, dryRun = true) _)
      else
        for {
          accessToken <- Zuora
            .accessTokenGetResponse(ordersConfig, ordersBackend)
            .left
            .map(failure => GenericError(failure.reason))
            .toClientFailableOp
        } yield orderCancellation(
          requests,
          ordersConfig,
          accessToken,
          ordersBackend,
          getRemainingTimeInMillis,
          orderDate,
        ) _

    cancellation
      .flatMap { cancelSubscription =>
        executeAll(acRequests)(executeCancel(requests, urlParams.dryRun, cancelSubscription))
      }
      .toApiGatewayOp("AutoCancel failed")
  }

  private[autoCancel] def executeAll[A](
      requests: List[AutoCancelRequest],
  )(execute: AutoCancelRequest => ClientFailableOp[A]): ClientFailableOp[Unit] =
    requests
      .map(execute)
      .collectFirst { case failure: ClientFailure => failure }
      .getOrElse(ClientSuccess(()))

  /*
   * This process applies at the subscription level.  It will potentially run multiple times per invoice.
   * The cancellation call generates a balancing invoice that should be negative and the same amount
   * as the amount outstanding for the invoice items corresponding to the subscription being processed
   * (there could be multiple invoice items per sub - it could include discounts and multi-day paper subs)
   * This means that after all subscriptions on an invoice have been cancelled, the balance of all
   * invoices should be 0.
   */
  private def executeCancel(
      requests: Requests,
      dryRun: Boolean,
      cancelSubscription: AutoCancelRequest => ClientFailableOp[ZuoraCancelSubscription.CancellationResponse],
  )(acRequest: AutoCancelRequest): ClientFailableOp[Unit] = {
    val AutoCancelRequest(accountId, subToCancel, cancellationDate) = acRequest
    logger.info(
      s"Attempting to perform auto-cancellation on account: $accountId for subscription: ${subToCancel.value}",
    )
    val zuoraUpdateCancellationReasonF =
      if (dryRun) ZuoraUpdateCancellationReason.dryRun(requests) _ else ZuoraUpdateCancellationReason(requests) _
    val zuoraGetInvoiceTransactionsF =
      if (dryRun) ZuoraGetInvoiceTransactions.dryRun(requests) _ else ZuoraGetInvoiceTransactions(requests) _
    val zuoraTransferToCreditBalanceF =
      if (dryRun) TransferToCreditBalance.dryRun(requests) _ else TransferToCreditBalance(requests) _
    val zuoraApplyCreditBalanceF = if (dryRun) ApplyCreditBalance.dryRun(requests) _ else ApplyCreditBalance(requests) _
    val zuoraOp = for {
      _ <- zuoraUpdateCancellationReasonF(subToCancel).withLogging("updateCancellationReason")
      cancellationResponse <- cancelSubscription(acRequest).withLogging("cancelSubscription")
      invoiceTransactionSummary <- zuoraGetInvoiceTransactionsF(accountId)
      unbalancedInvoices <- UnbalancedInvoices.fromSummary(
        accountId,
        invoiceTransactionSummary,
        cancellationResponse.invoiceId,
      )
      creditTransferAmount = -unbalancedInvoices.negativeInvoice.balance
      _ <- zuoraTransferToCreditBalanceF(cancellationResponse.invoiceId, creditTransferAmount, "Auto-cancellation")
        .withLogging("transferToCreditBalance")
      _ <- applyCreditBalances(zuoraApplyCreditBalanceF)(
        subToCancel,
        unbalancedInvoices.unpaidInvoices,
        "Auto-cancellation",
      ).withLogging("applyCreditBalance")
    } yield ()
    zuoraOp
  }

  private def legacyCancellation(
      requests: Requests,
      dryRun: Boolean,
  )(request: AutoCancelRequest): ClientFailableOp[ZuoraCancelSubscription.CancellationResponse] =
    if (dryRun) ZuoraCancelSubscription.dryRun(requests)(request.subToCancel, request.cancellationDate)
    else ZuoraCancelSubscription(requests)(request.subToCancel, request.cancellationDate)

  private def orderCancellation(
      requests: Requests,
      ordersConfig: HolidayStopProcessorZuoraConfig,
      accessToken: AccessToken,
      ordersBackend: SttpBackend[Identity, Any],
      getRemainingTimeInMillis: () => Int,
      orderDate: LocalDate,
  )(request: AutoCancelRequest): ClientFailableOp[ZuoraCancelSubscription.CancellationResponse] =
    for {
      maximumOrderDuration <- orderDuration(getRemainingTimeInMillis())
        .toRight(
          GenericError("Not enough Lambda time remains to safely submit the Zuora cancellation order"),
        )
        .toClientFailableOp
      orderResult <- ZuoraOrders
        .createOrderAsynchronously(ordersConfig, accessToken, ordersBackend, maximumOrderDuration)(
          CreateOrderRequest.forCancellation(
            accountId = request.accountId,
            subscriptionNumber = request.subToCancel.value,
            cancellationDate = request.cancellationDate,
            orderDate = orderDate,
          ),
        )
        .left
        .map(failure => GenericError(failure.reason))
        .toClientFailableOp
      invoiceNumber <- singleInvoiceNumber(orderResult.invoiceNumbers).toClientFailableOp
      invoiceId <- ZuoraGetInvoice(requests)(invoiceNumber)
    } yield ZuoraCancelSubscription.CancellationResponse(invoiceId)

  private[autoCancel] def singleInvoiceNumber(invoiceNumbers: Option[List[String]]): Either[GenericError, String] =
    invoiceNumbers match {
      case Some(invoiceNumber :: Nil) => Right(invoiceNumber)
      case Some(Nil) => Left(GenericError("Zuora completed the cancellation order without generating an invoice"))
      case Some(_) => Left(GenericError("Zuora generated more than one invoice for a single subscription cancellation"))
      case None => Left(GenericError("Zuora completed the cancellation order without returning invoice numbers"))
    }

  private[autoCancel] def orderDuration(remainingTimeInMillis: Int): Option[FiniteDuration] = {
    val availableDuration = remainingTimeInMillis.millis - PostOrderWorkBuffer
    Option.when(availableDuration >= MinimumOrderDuration) {
      if (availableDuration < ZuoraOrders.MaximumOrderDuration) availableDuration
      else ZuoraOrders.MaximumOrderDuration
    }
  }

  private[autoCancel] def applyCreditBalances(applyCreditBalance: (String, Double, String) => ClientFailableOp[Unit])(
      subToCancel: SubscriptionNumber,
      invoices: Seq[ItemisedInvoice],
      comment: String,
  ): ClientFailableOp[Unit] = {
    invoices
      .map(invoice =>
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
        },
      )
      .collectFirst { case failure: ClientFailure => failure }
      .getOrElse(ClientSuccess(()))
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

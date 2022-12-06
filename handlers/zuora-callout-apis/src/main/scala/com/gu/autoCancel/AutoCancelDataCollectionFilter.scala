package com.gu.autoCancel

import com.gu.autoCancel.AutoCancel.AutoCancelRequest
import com.gu.util.TypeConvert._
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse.noActionRequired
import com.gu.util.reader.Types.ApiGatewayOp._
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.ZuoraGetAccountSummary.{AccountSummary, Invoice}
import com.gu.util.zuora.{SubscriptionNumber, SubscriptionNumberWithStatus}

import java.time.LocalDate

object AutoCancelDataCollectionFilter extends Logging {

  def apply(
    now: LocalDate,
    getAccountSummary: String => ClientFailableOp[AccountSummary],
    getAccountSubscriptions: String => ClientFailableOp[List[SubscriptionNumberWithStatus]],
    getSubscriptionsOnInvoice: String => ClientFailableOp[List[SubscriptionNumber]]
  )(autoCancelCallout: AutoCancelCallout): ApiGatewayOp[List[AutoCancelRequest]] = {
    import autoCancelCallout._

    for {
      accountSummary <- getAccountSummary(accountId).toApiGatewayOp("getAccountSummary").withLogging("getAccountSummary")
      subsOnInvoice <- getSubscriptionsOnInvoice(invoiceId)
        .toApiGatewayOp("getSubscriptionsOnInvoice").withLogging("getSubscriptionsOnInvoice")
      subsOnAccount <- getAccountSubscriptions(accountId).toApiGatewayOp("getAccountSubscriptions")
        .withLogging("getAccountSubscriptions")
      subsToCancel <- filterNotActiveSubscriptions(subsOnAccount, subsOnInvoice).withLogging("filterNotActiveSubscriptions")
      cancellationDate <- getCancellationDateFromInvoice(invoiceId, accountSummary, now).withLogging("getCancellationDateFromInvoice")
    } yield subsToCancel
      .map { subToCancel =>
        AutoCancelRequest(accountId, subToCancel, cancellationDate)
      }
  }

  def getCancellationDateFromInvoice(invoiceId: String, accountSummary: AccountSummary, dateToday: LocalDate): ApiGatewayOp[LocalDate] = {
    accountSummary.invoices
      .find(inv => {
        logger.info(s"found callout invoice in accountSummary: $inv")
        inv.id == invoiceId
      })
      .find(invoiceOverdue(_, dateToday)) match {
        case None =>
          logger.error(s"Failed on Validating Unpaid invoice that was overdue, invoiceId: $invoiceId")
          ReturnWithResponse(noActionRequired("No unpaid and overdue invoices found!"))
        case Some(inv) =>
          logger.info(s"Found Valid Unpaid invoice for account: ${accountSummary.basicInfo.id}. Invoice: $inv")
          ContinueProcessing(inv.dueDate)
      }
  }

  def invoiceOverdue(invoice: Invoice, dateToday: LocalDate): Boolean = {
    /**
     * TODO invoice.balance > 0 may not be necessary as the trigger is on Invoice payment overdue event
     * but i am not sure at this moment
     */
    if (invoice.balance > 0 && invoice.status == "Posted") {
      val zuoraGracePeriod = 14L // This needs to match with the timeframe for the 3rd payment retry attempt in Zuora
      val invoiceOverdueDate = invoice.dueDate.plusDays(zuoraGracePeriod)
      logger.info(s"Zuora grace period is: $zuoraGracePeriod days. Due date for Invoice id ${invoice.id} is ${invoice.dueDate}, so it will be considered overdue on: $invoiceOverdueDate.")
      dateToday.isEqual(invoiceOverdueDate) || dateToday.isAfter(invoiceOverdueDate)
    } else false
  }

  // useful if one of subscriptions that is on invoice was cancelled manually before the trigger fired
  def filterNotActiveSubscriptions(
    accountSubsOnAccount: List[SubscriptionNumberWithStatus],
    subsOnInvoice: List[SubscriptionNumber]
  ): ApiGatewayOp[List[SubscriptionNumber]] = {
    val accountActiveSubs = accountSubsOnAccount.filter(_.status == "Active").map(_.number).toSet
    logger.info(s"got ${subsOnInvoice.size} subscriptions on invoice")
    logger.info(s"got ${accountActiveSubs.size} Active subscriptions on account")
    val uniqueSubsNamesToCancel = subsOnInvoice
      .filter(s => accountActiveSubs.contains(s.value))
    logger.info(s"${uniqueSubsNamesToCancel.size} subscriptions to cancel found")
    if (uniqueSubsNamesToCancel.nonEmpty) ContinueProcessing(uniqueSubsNamesToCancel)
    else ReturnWithResponse(noActionRequired("No Active subscriptions to cancel!"))
  }
}

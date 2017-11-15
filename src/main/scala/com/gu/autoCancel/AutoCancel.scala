package com.gu.autoCancel

import com.github.nscala_time.time.OrderingImplicits._
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse.noActionRequired
import com.gu.util.reader.Types.{ ConfigHttpFailableOp, FailableOp, _ }
import com.gu.util.zuora.Zuora
import com.gu.util.zuora.Zuora.{ CancelSubscription, DisableAutoPay, GetAccountSummary, UpdateCancellationReason }
import com.gu.util.zuora.ZuoraModels.{ AccountSummary, Invoice, SubscriptionSummary }
import org.joda.time.LocalDate

import scalaz.Scalaz._

object AutoCancel extends Logging {

  case class ACDeps(
    getAccountSummary: GetAccountSummary = Zuora.getAccountSummary,
    updateCancellationReason: UpdateCancellationReason = Zuora.updateCancellationReason,
    cancelSubscription: CancelSubscription = Zuora.cancelSubscription,
    disableAutoPay: DisableAutoPay = Zuora.disableAutoPay
  )

  def apply(date: LocalDate, autoCancelCallout: AutoCancelCallout, deps: ACDeps = ACDeps()): ConfigHttpFailableOp[Unit] = {
    val accountId = autoCancelCallout.accountId
    logger.info(s"Attempting to perform auto-cancellation on account: $accountId")
    for {
      accountSummary <- deps.getAccountSummary(accountId).withLogging("getAccountSummary")
      subToCancel <- getSubscriptionToCancel(accountSummary).toConfigHttpFailableOp.withLogging("getSubscriptionToCancel")
      cancellationDate <- getCancellationDateFromInvoices(accountSummary, date).toConfigHttpFailableOp.withLogging("getCancellationDateFromInvoices")
      updateSubscription <- deps.updateCancellationReason(subToCancel).withLogging("updateCancellationReason")
      cancelSubscription <- deps.cancelSubscription(subToCancel, cancellationDate).withLogging("cancelSubscription")
      disableAutoPay <- deps.disableAutoPay(accountId).withLogging("disableAutoPay")
    } yield ()
  }

  def getCancellationDateFromInvoices(accountSummary: AccountSummary, dateToday: LocalDate): FailableOp[LocalDate] = {
    val unpaidAndOverdueInvoices = accountSummary.invoices.filter { invoice => invoiceOverdue(invoice, dateToday) }
    if (unpaidAndOverdueInvoices.isEmpty) {
      logger.error(s"Failed to find an unpaid invoice that was overdue. The invoices we got were: ${accountSummary.invoices}")
      noActionRequired("No unpaid and overdue invoices found!").left
    } else {
      logger.info(s"Found at least one unpaid invoices for account: ${accountSummary.basicInfo.id}. Invoice id(s): ${unpaidAndOverdueInvoices.map(_.id)}")
      val earliestDueDate = unpaidAndOverdueInvoices.map(_.dueDate).min
      logger.info(s"Earliest overdue invoice for account ${accountSummary.basicInfo.id} has due date: $earliestDueDate. Setting this as the cancellation date.")
      earliestDueDate.right
    }
  }

  def invoiceOverdue(invoice: Invoice, dateToday: LocalDate): Boolean = {
    if (invoice.balance > 0 && invoice.status == "Posted") {
      val zuoraGracePeriod = 14 // This needs to match with the timeframe for the 3rd payment retry attempt in Zuora
      val invoiceOverdueDate = invoice.dueDate.plusDays(zuoraGracePeriod)
      logger.info(s"Zuora grace period is: $zuoraGracePeriod days. Due date for Invoice id ${invoice.id} is ${invoice.dueDate}, so it will be considered overdue on: $invoiceOverdueDate.")
      dateToday.isEqual(invoiceOverdueDate) || dateToday.isAfter(invoiceOverdueDate)
    } else false
  }

  def getSubscriptionToCancel(accountSummary: AccountSummary): FailableOp[SubscriptionSummary] = {
    val activeSubs = accountSummary.subscriptions.filter(_.status == "Active")
    activeSubs match {
      case sub :: Nil =>
        logger.info(s"Determined that we should cancel SubscriptionId: ${sub.id} (for AccountId: ${accountSummary.basicInfo.id})")
        sub.right
      case Nil =>
        logger.error(s"Didn't find any active subscriptions. The full list of subs for this account was: ${accountSummary.subscriptions}")
        noActionRequired("No Active subscriptions to cancel!").left
      case subs =>
        // This should be a pretty rare scenario, because the Billing Account to Sub relationship is (supposed to be) 1-to-1
        logger.error(s"More than one subscription is Active on account: ${accountSummary.basicInfo.id}. Subscription ids are: ${activeSubs.map(_.id)}")
        noActionRequired("More than one active sub found!").left // Don't continue because we don't know which active sub to cancel
    }
  }

}

package com.gu.autoCancel

import com.github.nscala_time.time.OrderingImplicits._
import com.gu.util.Config
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.apigateway.ApiGatewayResponse.{ logger, noActionRequired }
import com.gu.util.zuora.Types.{ FailableOp, ZuoraOp, _ }
import com.gu.util.zuora.Zuora
import com.gu.util.zuora.ZuoraModels.{ AccountSummary, Invoice, SubscriptionSummary }
import org.joda.time.LocalDate
import play.api.libs.json.Json

import scalaz.Scalaz._
import scalaz.{ -\/, \/- }

object AutoCancelSteps {
  def performZuoraAction(apiGatewayRequest: ApiGatewayRequest) = {
    for {
      autoCancelCallout <- Json.fromJson[AutoCancelCallout](Json.parse(apiGatewayRequest.body)).toFailableOp.toZuoraOp
      _ <- filterInvalidAccount(autoCancelCallout, onlyCancelDirectDebit = apiGatewayRequest.onlyCancelDirectDebit).toZuoraOp
      _ <- autoCancellation(LocalDate.now, autoCancelCallout).withLogging(s"auto-cancellation for ${autoCancelCallout.accountId}")
    } yield ()
  }

  def filterInvalidAccount(callout: AutoCancelCallout, onlyCancelDirectDebit: Boolean): FailableOp[Unit] = {
    for {
      _ <- filterAutoPay(callout)
      _ <- filterDirectDebit(onlyCancelDirectDebit = onlyCancelDirectDebit, nonDirectDebit = callout.nonDirectDebit)
    } yield ()
  }

  def filterAutoPay(callout: AutoCancelCallout): FailableOp[Unit] = {
    if (callout.isAutoPay) \/-(()) else -\/(noActionRequired("AutoPay is false"))
  }

  def filterDirectDebit(onlyCancelDirectDebit: Boolean, nonDirectDebit: Boolean): FailableOp[Unit] = {
    if (onlyCancelDirectDebit && nonDirectDebit)
      -\/(noActionRequired("it's not direct debit so we will wait longer"))
    else
      \/-(())
  }

  def autoCancellation(date: LocalDate, autoCancelCallout: AutoCancelCallout): ZuoraOp[Unit] = {
    val accountId = autoCancelCallout.accountId
    logger.info(s"Attempting to perform auto-cancellation on account: ${accountId}")
    for {
      accountSummary <- Zuora.getAccountSummary(accountId)
      subToCancel <- getSubscriptionToCancel(accountSummary).toZuoraOp
      cancellationDate <- getCancellationDateFromInvoices(accountSummary, date).toZuoraOp
      updateSubscription <- Zuora.updateCancellationReason(subToCancel)
      cancelSubscription <- Zuora.cancelSubscription(subToCancel, cancellationDate)
      disableAutoPay <- Zuora.disableAutoPay(accountId)
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
      case sub :: Nil => {
        logger.info(s"Determined that we should cancel SubscriptionId: ${sub.id} (for AccountId: ${accountSummary.basicInfo.id})")
        sub.right
      }
      case Nil => {
        logger.error(s"Didn't find any active subscriptions. The full list of subs for this account was: ${accountSummary.subscriptions}")
        noActionRequired("No Active subscriptions to cancel!").left
      }
      case subs => {
        // This should be a pretty rare scenario, because the Billing Account to Sub relationship is (supposed to be) 1-to-1
        logger.error(s"More than one subscription is Active on account: ${accountSummary.basicInfo.id}. Subscription ids are: ${activeSubs.map(_.id)}")
        noActionRequired("More than one active sub found!").left // Don't continue because we don't know which active sub to cancel
      }
    }
  }

}

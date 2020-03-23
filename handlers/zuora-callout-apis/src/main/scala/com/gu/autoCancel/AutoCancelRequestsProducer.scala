package com.gu.autoCancel

import java.time.LocalDate

import com.gu.autoCancel.AutoCancel.AutoCancelRequest
import com.gu.stripeCustomerSourceUpdated.TypeConvert._
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse.noActionRequired
import com.gu.util.reader.Types.ApiGatewayOp._
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.ZuoraGetAccountSummary.{AccountSummary, Invoice, SubscriptionId}
import play.api.libs.json.JsValue

object AutoCancelRequestsProducer extends Logging {

  private def invoiceItemsToSubscriptionsNames(getInvoiceItemsRes: JsValue): List[SubscriptionId] = {
    val parsed = (getInvoiceItemsRes \ "invoiceItems" \\ "subscriptionName")
      .map(_.as[String])
      .toSet
      .map(n => SubscriptionId(n))
    logger.info(s"invoiceItemsToSubscriptionsNames: $parsed")
    parsed.toList
  }

  def apply(
    now: LocalDate,
    getAccountSummary: String => ClientFailableOp[AccountSummary],
    getInvoiceItems: String => ClientFailableOp[JsValue]
  )(autoCancelCallout: AutoCancelCallout): ApiGatewayOp[List[AutoCancelRequest]] = {
    import autoCancelCallout._

    for {
      accountSummary <- getAccountSummary(accountId).toApiGatewayOp("getAccountSummary").withLogging("getAccountSummary")
      //      _ <- getSubscriptionToCancel(accountSummary).withLogging("getSubscriptionToCancel")
      invoiceItems <- getInvoiceItems(invoiceId).toApiGatewayOp("getInvoiceItems").withLogging("getInvoiceItems")
      cancellationDate <- getCancellationDateFromInvoices(accountSummary, now).withLogging("getCancellationDateFromInvoices")
    } yield invoiceItemsToSubscriptionsNames(invoiceItems).map { subToCancel =>
      AutoCancelRequest(accountId, subToCancel, cancellationDate)
    }
  }

  // should come from the invoice that triggered that event

  def getCancellationDateFromInvoices(accountSummary: AccountSummary, dateToday: LocalDate): ApiGatewayOp[LocalDate] = {
    val unpaidAndOverdueInvoices = accountSummary.invoices.filter { invoice => invoiceOverdue(invoice, dateToday) }
    if (unpaidAndOverdueInvoices.isEmpty) {
      logger.error(s"Failed to find an unpaid invoice that was overdue. The invoices we got were: ${accountSummary.invoices}")
      ReturnWithResponse(noActionRequired("No unpaid and overdue invoices found!"))
    } else {
      logger.info(s"Found at least one unpaid invoices for account: ${accountSummary.basicInfo.id}. Invoice id(s): ${unpaidAndOverdueInvoices.map(_.id)}")
      implicit val localDateOrdering: Ordering[LocalDate] = Ordering.by(_.toEpochDay)
      val earliestDueDate = unpaidAndOverdueInvoices.map(_.dueDate).min
      logger.info(s"Earliest overdue invoice for account ${accountSummary.basicInfo.id} has due date: $earliestDueDate. Setting this as the cancellation date.")
      ContinueProcessing(earliestDueDate)
    }
  }

  // TODO refactor

  def invoiceOverdue(invoice: Invoice, dateToday: LocalDate): Boolean = {
    if (invoice.balance > 0 && invoice.status == "Posted") {
      val zuoraGracePeriod = 14L // This needs to match with the timeframe for the 3rd payment retry attempt in Zuora
      val invoiceOverdueDate = invoice.dueDate.plusDays(zuoraGracePeriod)
      logger.info(s"Zuora grace period is: $zuoraGracePeriod days. Due date for Invoice id ${invoice.id} is ${invoice.dueDate}, so it will be considered overdue on: $invoiceOverdueDate.")
      dateToday.isEqual(invoiceOverdueDate) || dateToday.isAfter(invoiceOverdueDate)
    } else false
  }

  // TODO delete

//  def getSubscriptionToCancel(accountSummary: AccountSummary): ApiGatewayOp[SubscriptionId] = {
  //    val activeSubs = accountSummary.subscriptions.filter(_.status == "Active")
  //    activeSubs match {
  //      case sub :: Nil =>
  //        logger.info(s"Determined that we should cancel SubscriptionId: ${sub.id} (for AccountId: ${accountSummary.basicInfo.id})")
  //        ContinueProcessing(sub.id)
  //      case Nil =>
  //        logger.error(s"Didn't find any active subscriptions. The full list of subs for this account was: ${accountSummary.subscriptions}")
  //        ReturnWithResponse(noActionRequired("No Active subscriptions to cancel!"))
  //      case subs =>
  //        // This should be a pretty rare scenario, because the Billing Account to Sub relationship is (supposed to be) 1-to-1
  //        logger.error(s"More than one subscription is Active on account: ${accountSummary.basicInfo.id}. Subscription ids are: ${activeSubs.map(_.id)}")
  //        ReturnWithResponse(noActionRequired("More than one active sub found!")) // Don't continue because we don't know which active sub to cancel
  //    }
  //  }
}

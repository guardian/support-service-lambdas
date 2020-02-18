package com.gu.autoCancel

import java.time.LocalDate

import com.gu.util.apigateway.ApiGatewayResponse._
import com.gu.util.zuora.ZuoraGetAccountSummary.ZuoraAccount.{AccountId, PaymentMethodId}
import com.gu.util.zuora.ZuoraGetAccountSummary.{AccountSummary, BasicAccountInfo, Invoice, SubscriptionId, SubscriptionSummary}
import org.scalatest._

class AutoCancelDataCollectionFilterTest extends FlatSpec {

  import AutoCancelDataCollectionFilter._

  val basicInfo = BasicAccountInfo(AccountId("id123"), 11.99, PaymentMethodId("pmid"))
  val subscription = SubscriptionSummary(SubscriptionId("id123"), "A-S123", "Active")
  val twoSubscriptions = List(SubscriptionSummary(SubscriptionId("id123"), "A-S123", "Active"), SubscriptionSummary(SubscriptionId("id321"), "A-S321", "Active"))
  val inactiveSubscriptions = List(SubscriptionSummary(SubscriptionId("id456"), "A-S123", "Cancelled"), SubscriptionSummary(SubscriptionId("id789"), "A-S321", "Expired"))
  val invoiceNotPosted = Invoice("inv123", LocalDate.now.minusDays(5), 11.99, "Cancelled")
  val invoiceZeroBalance = Invoice("inv123", LocalDate.now.minusDays(1), 0.00, "Posted")
  val invoiceNotDue = Invoice("inv123", LocalDate.now.minusDays(3), 11.99, "Posted")
  val singleOverdueInvoice = Invoice("inv123", LocalDate.now.minusDays(14), 11.99, "Posted")
  val twoOverdueInvoices = List(Invoice("inv123", LocalDate.now.minusDays(21), 11.99, "Posted"), Invoice("inv321", LocalDate.now.minusDays(35), 11.99, "Posted"))

  "invoiceOverdue" should "return false if the invoice is not in a 'Posted' state" in {
    assert(invoiceOverdue(invoiceNotPosted, LocalDate.now) == false)
  }

  "invoiceOverdue" should "return false if the invoice does not have an outstanding balance" in {
    assert(invoiceOverdue(invoiceZeroBalance, LocalDate.now) == false)
  }

  "invoiceOverdue" should "return false if the invoice has a due date which is <= 21 days ago" in {
    assert(invoiceOverdue(invoiceNotDue, LocalDate.now) == false)
  }

  "invoiceOverdue" should "return true if the invoice has a due date which is >= 21 days ago (and other pre-reqs are met)" in {
    assert(invoiceOverdue(singleOverdueInvoice, LocalDate.now) == true)
  }

  "getCancellationDateFromInvoices" should "return a left if no overdue invoices are found" in {
    val apiGatewayOp = getCancellationDateFromInvoices(AccountSummary(basicInfo, List(subscription), List(invoiceZeroBalance, invoiceNotDue, invoiceNotPosted)), LocalDate.now)
    assert(apiGatewayOp.toDisjunction == Left(noActionRequired("No unpaid and overdue invoices found!")))
  }

  "getCancellationDateFromInvoices" should "return the due date of an invoice, if exactly one overdue invoice is found on the account" in {
    val apiGatewayOp = getCancellationDateFromInvoices(AccountSummary(basicInfo, List(subscription), List(singleOverdueInvoice)), LocalDate.now)
    assert(apiGatewayOp.toDisjunction == Right(LocalDate.now.minusDays(14)))
  }

  "getCancellationDateFromInvoices" should "return the earliest due date of all unpaid invoices, if there is more than one overdue invoice on the account" in {
    val accountSummaryUnpaidInvs = AccountSummary(basicInfo, List(subscription), twoOverdueInvoices)
    val apiGatewayOp = getCancellationDateFromInvoices(accountSummaryUnpaidInvs, LocalDate.now)
    assert(apiGatewayOp.toDisjunction == Right(LocalDate.now.minusDays(35)))
  }

  "getSubscriptionToCancel" should "return a left if there is more than one active sub on the account summary" in {
    val accountSummaryWithTwoSubs = AccountSummary(basicInfo, twoSubscriptions, twoOverdueInvoices)
    val apiGatewayOp = getSubscriptionToCancel(accountSummaryWithTwoSubs)
    assert(apiGatewayOp.toDisjunction == Left(noActionRequired("More than one active sub found!")))
  }

  "getSubscriptionToCancel" should "return a left if there are no subs on the account summary" in {
    val accountSummaryWithCancelledSub = AccountSummary(basicInfo, List(), List(invoiceNotDue))
    val apiGatewayOp = getSubscriptionToCancel(accountSummaryWithCancelledSub)
    assert(apiGatewayOp.toDisjunction == Left(noActionRequired("No Active subscriptions to cancel!")))
  }

  "getSubscriptionToCancel" should "return a left if the account summary only contains cancelled and expired subs" in {
    val accountSummaryCancelledSub = AccountSummary(basicInfo, inactiveSubscriptions, List(singleOverdueInvoice))
    val apiGatewayOp = getSubscriptionToCancel(accountSummaryCancelledSub)
    assert(apiGatewayOp.toDisjunction == Left(noActionRequired("No Active subscriptions to cancel!")))
  }

  "getSubscriptionToCancel" should "return a right[Subscription] if there is exactly one active sub on the account summary" in {
    val accountSummaryWithSingleSub = AccountSummary(basicInfo, List(subscription), List(invoiceNotDue))
    val apiGatewayOp = getSubscriptionToCancel(accountSummaryWithSingleSub)
    assert(apiGatewayOp.toDisjunction == Right(subscription.id))
  }

}

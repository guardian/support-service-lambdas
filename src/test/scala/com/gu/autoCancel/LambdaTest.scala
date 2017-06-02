package com.gu.autoCancel

import com.gu.autoCancel.APIGatewayResponse._
import com.gu.autoCancel.Lambda._
import com.gu.autoCancel.ZuoraModels.{ UpdateSubscriptionResult, _ }
import org.joda.time.LocalDate
import org.scalatest._

import scalaz.{ -\/, \/- }

class LambdaTest extends FlatSpec {

  val basicInfo = BasicAccountInfo("id123", 11.99)
  val subscription = SubscriptionSummary("id123", "A-S123", "Active")
  val twoSubscriptions = List(SubscriptionSummary("id123", "A-S123", "Active"), SubscriptionSummary("id321", "A-S321", "Active"))
  val inactiveSubscriptions = List(SubscriptionSummary("id456", "A-S123", "Cancelled"), SubscriptionSummary("id789", "A-S321", "Expired"))
  val invoiceNotPosted = Invoice("inv123", LocalDate.now.minusDays(5), 11.99, "Cancelled")
  val invoiceZeroBalance = Invoice("inv123", LocalDate.now.minusDays(1), 0.00, "Posted")
  val invoiceNotDue = Invoice("inv123", LocalDate.now.minusDays(3), 11.99, "Posted")
  val singleOverdueInvoice = Invoice("inv123", LocalDate.now.minusDays(14), 11.99, "Posted")
  val twoOverdueInvoices = List(Invoice("inv123", LocalDate.now.minusDays(21), 11.99, "Posted"), Invoice("inv321", LocalDate.now.minusDays(35), 11.99, "Posted"))

  "parseXML" should "successfully parse a 'good' XML sample" in {
    val body =
      <callout>
        <parameter name="AccountId">acc123</parameter>
        <parameter name="AutoPay">true</parameter>
      </callout>
    assert(parseXML(body) == \/-("acc123"))
  }

  "parseXML" should "reject an account if auto-pay is not true" in {
    val body =
      <callout>
        <parameter name="AccountId">acc123</parameter>
        <parameter name="AutoPay">false</parameter>
      </callout>
    assert(parseXML(body) == -\/(noActionRequired("AutoRenew is not = true, we should not process a cancellation for this account")))
  }

  "parseXML" should "fail to parse a 'bad' XML sample" in {
    val body =
      <callout>
        <fakeTag>badData</fakeTag>
      </callout>
    assert(parseXML(body) == -\/(badRequest))
  }

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
    val either = getCancellationDateFromInvoices(AccountSummary(basicInfo, List(subscription), List(invoiceZeroBalance, invoiceNotDue, invoiceNotPosted)), LocalDate.now)
    assert(either == -\/(noActionRequired("No unpaid and overdue invoices found!")))
  }

  "getCancellationDateFromInvoices" should "return the due date of an invoice, if exactly one overdue invoice is found on the account" in {
    val either = getCancellationDateFromInvoices(AccountSummary(basicInfo, List(subscription), List(singleOverdueInvoice)), LocalDate.now)
    assert(either == \/-(LocalDate.now.minusDays(14)))
  }

  "getCancellationDateFromInvoices" should "return the earliest due date of all unpaid invoices, if there is more than one overdue invoice on the account" in {
    val accountSummaryUnpaidInvs = AccountSummary(basicInfo, List(subscription), twoOverdueInvoices)
    val either = getCancellationDateFromInvoices(accountSummaryUnpaidInvs, LocalDate.now)
    assert(either == \/-(LocalDate.now.minusDays(35)))
  }

  "getSubscriptionToCancel" should "return a left if there is more than one active sub on the account summary" in {
    val accountSummaryWithTwoSubs = AccountSummary(basicInfo, twoSubscriptions, twoOverdueInvoices)
    val either = getSubscriptionToCancel(accountSummaryWithTwoSubs)
    assert(either == -\/(noActionRequired("More than one active sub found!")))
  }

  "getSubscriptionToCancel" should "return a left if there are no subs on the account summary" in {
    val accountSummaryWithCancelledSub = AccountSummary(basicInfo, List(), List(invoiceNotDue))
    val either = getSubscriptionToCancel(accountSummaryWithCancelledSub)
    assert(either == -\/(noActionRequired("No Active subscriptions to cancel!")))
  }

  "getSubscriptionToCancel" should "return a left if the account summary only contains cancelled and expired subs" in {
    val accountSummaryCancelledSub = AccountSummary(basicInfo, inactiveSubscriptions, List(singleOverdueInvoice))
    val either = getSubscriptionToCancel(accountSummaryCancelledSub)
    assert(either == -\/(noActionRequired("No Active subscriptions to cancel!")))
  }

  "getSubscriptionToCancel" should "return a right[Subscription] if there is exactly one active sub on the account summary" in {
    val accountSummaryWithSingleSub = AccountSummary(basicInfo, List(subscription), List(invoiceNotDue))
    val either = getSubscriptionToCancel(accountSummaryWithSingleSub)
    assert(either == \/-(subscription))
  }

  "handleZuoraResults" should "return a left if the UpdateSubscriptionResult indicates failure" in {
    val either = handleZuoraResults(UpdateSubscriptionResult(false, "id321"), CancelSubscriptionResult(true, LocalDate.now()), UpdateAccountResult(true))
    assert(either == -\/(internalServerError("Received at least one failure result from Zuora during autoCancellation")))
  }

  "handleZuoraResults" should "return a left if the CancelSubscriptionResult indicates failure" in {
    val either = handleZuoraResults(UpdateSubscriptionResult(true, "id321"), CancelSubscriptionResult(false, LocalDate.now()), UpdateAccountResult(true))
    assert(either == -\/(internalServerError("Received at least one failure result from Zuora during autoCancellation")))
  }

  "handleZuoraResults" should "return a left if the UpdateAccountResult indicates failure" in {
    val either = handleZuoraResults(UpdateSubscriptionResult(true, "id321"), CancelSubscriptionResult(true, LocalDate.now()), UpdateAccountResult(false))
    assert(either == -\/(internalServerError("Received at least one failure result from Zuora during autoCancellation")))
  }

  "handleZuoraResults" should "return a right[Unit] if all Zuora results indicate success" in {
    val either = handleZuoraResults(UpdateSubscriptionResult(true, "id321"), CancelSubscriptionResult(true, LocalDate.now()), UpdateAccountResult(true))
    assert(either == \/-(()))
  }

}

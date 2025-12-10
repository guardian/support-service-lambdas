package com.gu.autoCancel

import java.time.LocalDate

import com.gu.util.apigateway.ApiGatewayResponse._
import com.gu.util.zuora.{SubscriptionNumber, SubscriptionNumberWithStatus}
import com.gu.util.zuora.ZuoraGetAccountSummary.ZuoraAccount.{AccountId, PaymentMethodId}
import com.gu.util.zuora.ZuoraGetAccountSummary.{
  AccountSummary,
  BasicAccountInfo,
  Invoice,
  SubscriptionId,
  SubscriptionSummary,
}
import org.scalatest.flatspec.AnyFlatSpec

class AutoCancelDataCollectionFilterTest extends AnyFlatSpec {

  import AutoCancelDataCollectionFilter._

  private val basicInfo = BasicAccountInfo(AccountId("id123"), 11.99, PaymentMethodId("pmid"))
  private val subscription = SubscriptionSummary(SubscriptionId("id123"), "A-S123", "Active")
  private val invoiceNotPosted = Invoice("inv123", LocalDate.now.minusDays(5), 11.99, "Cancelled")
  private val invoiceZeroBalance = Invoice("inv123", LocalDate.now.minusDays(1), 0.00, "Posted")
  private val invoiceNotDue = Invoice("inv123", LocalDate.now.minusDays(3), 11.99, "Posted")
  private val singleOverdueInvoice = Invoice("inv123", LocalDate.now.minusDays(14), 11.99, "Posted")
  private val twoOverdueInvoices = List(
    Invoice("inv123", LocalDate.now.minusDays(21), 11.99, "Posted"),
    Invoice("inv321", LocalDate.now.minusDays(35), 11.99, "Posted"),
  )

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
    val apiGatewayOp = getCancellationDateFromInvoice(
      invoiceZeroBalance.id,
      AccountSummary(basicInfo, List(subscription), List(invoiceZeroBalance, invoiceNotDue, invoiceNotPosted)),
      LocalDate.now,
    )
    assert(apiGatewayOp.toDisjunction == Left(noActionRequired("No unpaid and overdue invoices found!")))
  }

  "getCancellationDateFromInvoices" should "return the due date of an invoice, if exactly one overdue invoice is found on the account" in {
    val apiGatewayOp = getCancellationDateFromInvoice(
      singleOverdueInvoice.id,
      AccountSummary(basicInfo, List(subscription), List(singleOverdueInvoice)),
      LocalDate.now,
    )
    assert(apiGatewayOp.toDisjunction == Right(LocalDate.now.minusDays(14)))
  }

  "getCancellationDateFromInvoices" should "return the earliest due date when there are multiple overdue invoices, to ensure sufficient credit is generated" in {
    val accountSummaryUnpaidInvs = AccountSummary(basicInfo, List(subscription), twoOverdueInvoices)
    val apiGatewayOp =
      getCancellationDateFromInvoice(twoOverdueInvoices.head.id, accountSummaryUnpaidInvs, LocalDate.now)
    // twoOverdueInvoices(1) has dueDate of now.minusDays(35), which is earlier than head's now.minusDays(21)
    assert(apiGatewayOp.toDisjunction == Right(twoOverdueInvoices(1).dueDate))
  }

  "getCancellationDateFromInvoices" should "use earliest date even when callout is for a newer invoice (disputed payments scenario)" in {
    // Simulates disputed payments scenario: multiple unpaid invoices from Stripe disputes
    val olderDisputedInvoice = Invoice("inv_old", LocalDate.now.minusDays(60), 25.00, "Posted")
    val middleDisputedInvoice = Invoice("inv_mid", LocalDate.now.minusDays(40), 25.00, "Posted")
    val newerDisputedInvoice = Invoice("inv_new", LocalDate.now.minusDays(20), 25.00, "Posted")

    val accountSummary = AccountSummary(
      basicInfo,
      List(subscription),
      List(newerDisputedInvoice, middleDisputedInvoice, olderDisputedInvoice),
    )

    // Callout triggered for the newer invoice, but we should use the oldest date
    val apiGatewayOp = getCancellationDateFromInvoice(newerDisputedInvoice.id, accountSummary, LocalDate.now)

    // Should return the oldest invoice's due date to generate enough credit for all 3 invoices
    assert(apiGatewayOp.toDisjunction == Right(olderDisputedInvoice.dueDate))
  }

  "filterNotActiveSubscriptions" should "return only active subscriptions from subscriptions on the invoice, " +
    "useful if one of subscriptions that is on invoice was cancelled manually before the trigger fired" in {
      val subsNamesOnInvoice = List(SubscriptionNumber("A-S123"), SubscriptionNumber("A-S456"))
      val accountSubs = List(
        SubscriptionNumberWithStatus("A-S123", "Active"),
        SubscriptionNumberWithStatus("A-S456", "Cancelled"),
        SubscriptionNumberWithStatus("A-S789", "Active"),
        SubscriptionNumberWithStatus("A-S101112", "Active"),
      )
      val apiGatewayOp = filterNotActiveSubscriptions(accountSubs, subsNamesOnInvoice)
      assert(apiGatewayOp.toDisjunction == Right(List(SubscriptionNumber("A-S123"))))
    }

}

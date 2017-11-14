package com.gu.autoCancel

import com.gu.util.TrustedApiConfig
import com.gu.util.apigateway.ApiGatewayResponse._
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, RequestAuth}
import com.gu.util.zuora.ZuoraModels._
import org.joda.time.LocalDate
import org.scalatest._
import play.api.libs.json.{JsSuccess, Json}

import scalaz.{-\/, \/-}

class AutoCancelHandlerTest extends FlatSpec {

  import AutoCancelSteps._

  val basicInfo = BasicAccountInfo("id123", 11.99)
  val subscription = SubscriptionSummary("id123", "A-S123", "Active")
  val twoSubscriptions = List(SubscriptionSummary("id123", "A-S123", "Active"), SubscriptionSummary("id321", "A-S321", "Active"))
  val inactiveSubscriptions = List(SubscriptionSummary("id456", "A-S123", "Cancelled"), SubscriptionSummary("id789", "A-S321", "Expired"))
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

  //  "handleZuoraResults" should "return a left if the UpdateSubscriptionResult indicates failure" in {
  //    val either = handleZuoraResults(UpdateSubscriptionResult(false, "id321"), CancelSubscriptionResult(true, LocalDate.now()), UpdateAccountResult(true))
  //    assert(either == -\/(internalServerError("Received at least one failure result from Zuora during autoCancellation")))
  //  }
  //
  //  "handleZuoraResults" should "return a left if the CancelSubscriptionResult indicates failure" in {
  //    val either = handleZuoraResults(UpdateSubscriptionResult(true, "id321"), CancelSubscriptionResult(false, LocalDate.now()), UpdateAccountResult(true))
  //    assert(either == -\/(internalServerError("Received at least one failure result from Zuora during autoCancellation")))
  //  }
  //
  //  "handleZuoraResults" should "return a left if the UpdateAccountResult indicates failure" in {
  //    val either = handleZuoraResults(UpdateSubscriptionResult(true, "id321"), CancelSubscriptionResult(true, LocalDate.now()), UpdateAccountResult(false))
  //    assert(either == -\/(internalServerError("Received at least one failure result from Zuora during autoCancellation")))
  //  }
  //
  //  "handleZuoraResults" should "return a right[Unit] if all Zuora results indicate success" in {
  //    val either = handleZuoraResults(UpdateSubscriptionResult(true, "id321"), CancelSubscriptionResult(true, LocalDate.now()), UpdateAccountResult(true))
  //    assert(either == \/-(()))
  //  }

  "filterInvalidAccount" should "return a left if AutoPay = false" in {
    val autoCancelCallout = AutoCancelCallout(accountId = "id123", autoPay = "false", "PayPal")
    val either = filterInvalidAccount(autoCancelCallout, false)
    assert(either match {
      case -\/(_) => true
      case _ => false
    }, s"We got: $either")
  }

  "filterInvalidAccount" should "return a right if AutoPay = true" in {
    val autoCancelCallout = AutoCancelCallout(accountId = "id123", autoPay = "true", "PayPal")
    val either = filterInvalidAccount(autoCancelCallout, false)
    assert(either match {
      case \/-(_) => true
      case _ => false
    }, s"We got: $either")
  }

  "filterDirectDebit" should "return a left if we're only cancelling direct debits, but the sub isn't paid that way" in {
    val either = filterDirectDebit(onlyCancelDirectDebit = true, nonDirectDebit = true)
    assert(either match {
      case -\/(_) => true
      case _ => false
    }, s"We got: $either")
  }

  "filterDirectDebit" should "return a right if we're not just cancelling direct debits even if it's not paid by DD" in {
    val either = filterDirectDebit(onlyCancelDirectDebit = false, nonDirectDebit = true)
    assert(either match {
      case \/-(_) => true
      case _ => false
    }, s"We got: $either")
  }

  "filterDirectDebit" should "return a right if we're only cancelling DDs and it is a direct debit" in {
    val either = filterDirectDebit(onlyCancelDirectDebit = true, nonDirectDebit = false)
    assert(either match {
      case \/-(_) => true
      case _ => false
    }, s"We got: $either")
  }

  "authenticateCallout" should "return a left if the credentials are invalid" in {
    val requestAuth = RequestAuth(apiClientId = "correctId", apiToken = "token")
    val trustedApiConfig = TrustedApiConfig(apiClientId = "wrongId", apiToken = "token", tenantId = "tenant")
    assert(ApiGatewayHandler.authenticateCallout(Some(requestAuth), trustedApiConfig) == -\/(unauthorized))
  }

  "authenticateCallout" should "return a right if the credentials are valid" in {
    val requestAuth = RequestAuth(apiClientId = "correctId", apiToken = "token")
    val trustedApiConfig = TrustedApiConfig(apiClientId = "correctId", apiToken = "token", tenantId = "tenant")
    assert(ApiGatewayHandler.authenticateCallout(Some(requestAuth), trustedApiConfig) == \/-(()))
  }

}

class DeserialiserTest extends FlatSpec with Matchers {

  "deserialise APIGatewayRequest" should "manage without the only direct debit param" in {
    val json = """{"queryStringParameters": {"apiToken": "a", "apiClientId": "b"}, "body": "haha"}"""
    val actualRequest = Json.parse(json).validate[ApiGatewayRequest]

    actualRequest.map(_.queryStringParameters.flatMap(_.onlyCancelDirectDebit)) should be(JsSuccess(None))

  }

  it should "manage with the only direct debit param being false" in {
    val json = """{"queryStringParameters": {"apiToken": "a", "apiClientId": "b", "onlyCancelDirectDebit": "false"}, "body": "haha"}"""
    val actualRequest = Json.parse(json).validate[ApiGatewayRequest]

    actualRequest.map(_.onlyCancelDirectDebit) should be(JsSuccess(false))

  }

  it should "manage with the only direct debit param being true" in {
    val json = """{"queryStringParameters": {"apiToken": "a", "apiClientId": "b", "onlyCancelDirectDebit": "true"}, "body": "haha"}"""
    val actualRequest = Json.parse(json).validate[ApiGatewayRequest]

    actualRequest.map(_.onlyCancelDirectDebit) should be(JsSuccess(true))

  }

}

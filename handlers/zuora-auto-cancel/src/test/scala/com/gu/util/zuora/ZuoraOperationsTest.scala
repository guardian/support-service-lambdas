package com.gu.util.zuora

import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientSuccess
import com.gu.util.zuora.ZuoraGetAccountSummary.{
  AccountSummary,
  BasicAccountInfo,
  Invoice,
  SubscriptionId,
  SubscriptionSummary,
}
import com.gu.util.zuora.ZuoraGetAccountSummary.ZuoraAccount.{AccountId, PaymentMethodId}
import com.gu.util.zuora.ZuoraGetInvoiceTransactions.{InvoiceItem, InvoiceTransactionSummary, ItemisedInvoice}
import okhttp3.{MediaType, Protocol, Request, Response, ResponseBody}
import okio.Buffer
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.{JsValue, Json}

import java.time.LocalDate

class ZuoraOperationsTest extends AnyFlatSpec with Matchers {
  private val baseUrl = "https://rest.test.zuora.com/v1/"
  private val success = Json.obj("success" -> true)
  private val date = LocalDate.of(2026, 9, 15)

  private class HttpOperation(method: String, path: String, response: JsValue, body: Option[JsValue] = None) {
    var calls = 0

    val requests = new Requests(
      headers = Map.empty,
      baseUrl = baseUrl,
      getResponse = (request: Request) => {
        calls shouldBe 0
        calls += 1
        request.method() shouldBe method
        request.url().toString shouldBe baseUrl + path
        val actualBody = Option(request.body()).map { requestBody =>
          val buffer = new Buffer()
          requestBody.writeTo(buffer)
          Json.parse(buffer.readUtf8())
        }
        actualBody shouldBe body
        new Response.Builder()
          .request(request)
          .protocol(Protocol.HTTP_1_1)
          .code(200)
          .message("OK")
          .body(ResponseBody.create(Json.stringify(response), MediaType.parse("application/json")))
          .build()
      },
      jsonIsSuccessful = ZuoraRestRequestMaker.zuoraIsSuccessful,
    )
  }

  "Zuora account operations" should "request and parse an account summary" in {
    val operation = new HttpOperation(
      "GET",
      "accounts/account-1/summary",
      success ++ Json.obj(
        "basicInfo" -> Json
          .obj("id" -> "account-1", "balance" -> 20, "defaultPaymentMethod" -> Json.obj("id" -> "payment-1")),
        "subscriptions" -> Json.arr(Json.obj("id" -> "sub-1", "subscriptionNumber" -> "A-S001", "status" -> "Active")),
        "invoices" -> Json.arr(
          Json.obj("id" -> "invoice-1", "dueDate" -> date.toString, "balance" -> 20, "status" -> "Posted"),
        ),
      ),
    )

    new ZuoraGetAccountSummary(operation.requests).getAccountSummary("account-1") shouldBe ClientSuccess(
      AccountSummary(
        BasicAccountInfo(AccountId("account-1"), 20, PaymentMethodId("payment-1")),
        List(SubscriptionSummary(SubscriptionId("sub-1"), "A-S001", "Active")),
        List(Invoice("invoice-1", date, 20, "Posted")),
      ),
    )
    operation.calls shouldBe 1
  }

  it should "request account subscriptions with the existing page size and retain their status" in {
    val operation = new HttpOperation(
      "GET",
      "subscriptions/accounts/account-1?pageSize=40",
      success ++ Json.obj(
        "subscriptions" -> Json.arr(
          Json.obj("subscriptionNumber" -> "A-S001", "status" -> "Active"),
          Json.obj("subscriptionNumber" -> "A-S002", "status" -> "Cancelled"),
        ),
      ),
    )

    new ZuoraGetAccountSubscriptions(operation.requests).getAccountSubscriptions("account-1") shouldBe ClientSuccess(
      List(SubscriptionNumberWithStatus("A-S001", "Active"), SubscriptionNumberWithStatus("A-S002", "Cancelled")),
    )
    operation.calls shouldBe 1
  }

  it should "request and deduplicate the subscriptions on an invoice" in {
    val operation = new HttpOperation(
      "GET",
      "invoices/invoice-1/items",
      success ++ Json.obj(
        "invoiceItems" -> Json.arr(
          Json.obj("subscriptionName" -> "A-S001"),
          Json.obj("subscriptionName" -> "A-S001"),
          Json.obj("subscriptionName" -> "A-S002"),
        ),
      ),
    )

    new ZuoraGetSubsNamesOnInvoice(operation.requests)
      .getSubscriptionsOnInvoice("invoice-1")
      .map(_.toSet) shouldBe ClientSuccess(Set(SubscriptionNumber("A-S001"), SubscriptionNumber("A-S002")))
    operation.calls shouldBe 1
  }

  "Zuora invoice operations" should "request and parse itemised invoice transactions" in {
    val operation = new HttpOperation(
      "GET",
      "transactions/invoices/accounts/account-1",
      success ++ Json.obj(
        "invoices" -> Json.arr(
          Json.obj(
            "id" -> "invoice-1",
            "invoiceDate" -> date.toString,
            "amount" -> 13,
            "balance" -> 10,
            "status" -> "Posted",
            "invoiceItems" -> Json.arr(
              Json.obj(
                "id" -> "item-1",
                "subscriptionName" -> "A-S001",
                "serviceStartDate" -> date.toString,
                "serviceEndDate" -> date.plusMonths(1).toString,
                "chargeAmount" -> 12,
                "taxAmount" -> 1,
                "chargeName" -> "charge",
                "productName" -> "Supporter Plus",
              ),
            ),
          ),
        ),
      ),
    )

    new ZuoraGetInvoiceTransactions(operation.requests).getInvoiceTransactions("account-1") shouldBe ClientSuccess(
      InvoiceTransactionSummary(
        List(
          ItemisedInvoice(
            "invoice-1",
            date,
            13,
            10,
            "Posted",
            List(InvoiceItem("item-1", "A-S001", date, date.plusMonths(1), 12, "charge", "Supporter Plus", 1)),
          ),
        ),
      ),
    )
    operation.calls shouldBe 1
  }

  "ZuoraUpdateCancellationReason" should "send the existing cancellation reason and subscription path" in {
    val operation = new HttpOperation(
      "PUT",
      "subscriptions/A-S001",
      success,
      Some(Json.obj("CancellationReason__c" -> "System AutoCancel")),
    )

    new ZuoraUpdateCancellationReason(operation.requests).update(SubscriptionNumber("A-S001")) shouldBe ClientSuccess(
      (),
    )
    operation.calls shouldBe 1
  }

  private def adjustment(invoiceId: String, amount: BigDecimal, adjustmentType: String): HttpOperation =
    new HttpOperation(
      "POST",
      "object/credit-balance-adjustment",
      success,
      Some(
        Json.obj(
          "SourceTransactionId" -> invoiceId,
          "Amount" -> amount,
          "Type" -> adjustmentType,
          "Comment" -> "Auto-cancellation",
        ),
      ),
    )

  "Zuora credit operations" should "increase the credit balance using the correct invoice, amount and comment" in {
    val operation = adjustment("balancing-1", BigDecimal("30.25"), "Increase")

    new TransferToCreditBalance(operation.requests)
      .transferToCreditBalance("balancing-1", BigDecimal("30.25"), "Auto-cancellation") shouldBe ClientSuccess(())
    operation.calls shouldBe 1
  }

  it should "decrease the credit balance when applying it to an unpaid invoice" in {
    val operation = adjustment("unpaid-1", BigDecimal("10.25"), "Decrease")

    new ApplyCreditBalance(operation.requests)
      .applyCreditBalance("unpaid-1", 10.25, "Auto-cancellation") shouldBe ClientSuccess(())
    operation.calls shouldBe 1
  }
}

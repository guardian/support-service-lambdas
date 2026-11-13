package com.gu.util.zuora

import com.gu.autoCancel.AutoCancel.{AutoCancelRequest, CancellationResponse}
import okhttp3.{MediaType, Protocol, Request, Response, ResponseBody}
import okio.Buffer
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.{JsNull, JsNumber, JsString, JsValue, Json}

import java.time.LocalDate
import scala.collection.mutable.ListBuffer

class ZuoraOrderCancellationTest extends AnyFlatSpec with Matchers with EitherValues {
  private val orderDate = LocalDate.of(2026, 10, 20)
  private val cancellationDate = LocalDate.of(2026, 9, 15)
  private val calloutInvoiceId = "unpaid-1"
  private val request = AutoCancelRequest("account-1", SubscriptionNumber("A-S001"), cancellationDate)
  private val orderBody = Json.obj(
    "orderDate" -> orderDate.toString,
    "existingAccountId" -> request.accountId,
    "subscriptions" -> Json.arr(
      Json.obj(
        "subscriptionNumber" -> request.subToCancel.value,
        "orderActions" -> Json.arr(
          Json.obj(
            "type" -> "CancelSubscription",
            "triggerDates" -> Json.arr(
              Json.obj("name" -> "ContractEffective", "triggerDate" -> cancellationDate.toString),
            ),
            "cancelSubscription" -> Json.obj(
              "cancellationPolicy" -> "SpecificDate",
              "cancellationEffectiveDate" -> cancellationDate.toString,
            ),
          ),
        ),
      ),
    ),
    "processingOptions" -> Json.obj("runBilling" -> true, "collectPayment" -> false),
  )

  private class OrderApi {
    var calls = 0
    val bodies = ListBuffer.empty[String]
    val idempotencyKeys = ListBuffer.empty[String]
    var status = 200
    var response = """{"success":true,"status":"Completed","orderNumber":"O-001","invoiceNumbers":["INV-000001"]}"""
    var invoiceStatus = 200
    var invoiceResponse = """{"id":"balancing-1"}"""
    var invoiceCalls = 0

    private val requests = ZuoraRestRequestMaker.oauth(
      (httpRequest: Request) => {
        httpRequest.header("Authorization") shouldBe "Bearer test-access-token"
        httpRequest.header("apiAccessKeyId") shouldBe null
        httpRequest.header("apiSecretAccessKey") shouldBe null
        val (responseStatus, responseBody) = httpRequest.method() match {
          case "POST" =>
            calls += 1
            httpRequest.url().toString shouldBe "https://rest.test.zuora.com/v1/orders"
            idempotencyKeys += Option(httpRequest.header("Idempotency-Key")).getOrElse(fail("Missing idempotency key"))
            val buffer = new Buffer()
            httpRequest.body().writeTo(buffer)
            bodies += buffer.readUtf8()
            status -> response
          case "GET" =>
            invoiceCalls += 1
            calls shouldBe invoiceCalls
            httpRequest.url().toString shouldBe "https://rest.test.zuora.com/v1/invoices/INV-000001"
            httpRequest.header("Idempotency-Key") shouldBe null
            invoiceStatus -> invoiceResponse
          case method => fail(s"Unexpected HTTP method: $method")
        }
        new Response.Builder()
          .request(httpRequest)
          .protocol(Protocol.HTTP_1_1)
          .code(responseStatus)
          .message("scripted response")
          .body(ResponseBody.create(responseBody, MediaType.parse("application/json")))
          .build()
      },
      "https://rest.test.zuora.com/v1",
      "test-access-token",
    )
    private val cancellation = new ZuoraOrderCancellation(requests)

    def cancel(
        actualRequest: AutoCancelRequest = request,
        sourceInvoiceId: String = calloutInvoiceId,
        date: LocalDate = orderDate,
    ) = cancellation.cancel(actualRequest, sourceInvoiceId, date).toDisjunction
  }

  "ZuoraOrderCancellation" should "cancel synchronously using OAuth and look up the returned invoice number's ID" in {
    val api = new OrderApi

    api.cancel() shouldBe Right(CancellationResponse("balancing-1", OrderNumber("O-001")))

    api.calls shouldBe 1
    api.invoiceCalls shouldBe 1
    Json.parse(api.bodies.head) shouldBe orderBody
    api.idempotencyKeys.head should startWith("auto-cancel-")
    api.idempotencyKeys.head.length should be < 255
  }

  it should "reuse the idempotency key on redelivery even if processing and cancellation dates have changed" in {
    val api = new OrderApi

    api.cancel() shouldBe Right(CancellationResponse("balancing-1", OrderNumber("O-001")))
    api.cancel(
      actualRequest = request.copy(cancellationDate = cancellationDate.minusDays(1)),
      date = orderDate.plusDays(1),
    ) shouldBe Right(CancellationResponse("balancing-1", OrderNumber("O-001")))

    api.idempotencyKeys.distinct should have size 1
    api.calls shouldBe 2
    api.invoiceCalls shouldBe 2
  }

  it should "use distinct keys for different accounts, subscriptions and source invoices" in {
    val api = new OrderApi

    api.cancel().isRight shouldBe true
    api.cancel(actualRequest = request.copy(accountId = "account-2")).isRight shouldBe true
    api.cancel(actualRequest = request.copy(subToCancel = SubscriptionNumber("A-S002"))).isRight shouldBe true
    api.cancel(sourceInvoiceId = "unpaid-2").isRight shouldBe true

    api.idempotencyKeys.distinct should have size 4
    api.invoiceCalls shouldBe 4
  }

  it should "surface a cached failure without changing the key or retrying within the invocation" in {
    val api = new OrderApi
    api.response = """{"success":false,"reasons":[{"code":50000050,"message":"Locking contention"}]}"""

    val firstFailure = api.cancel().left.value
    val secondFailure = api.cancel().left.value

    firstFailure.message should include("Locking contention")
    firstFailure.body should include("50000050")
    secondFailure shouldBe firstFailure
    api.calls shouldBe 2
    api.idempotencyKeys.distinct should have size 1
    api.invoiceCalls shouldBe 0
  }

  List(409, 429, 500).foreach { status =>
    it should s"surface HTTP $status without resubmitting the order" in {
      val api = new OrderApi
      api.status = status

      api.cancel().isLeft shouldBe true

      api.calls shouldBe 1
      api.invoiceCalls shouldBe 0
    }
  }

  List(
    "success=false" -> """{"success":false,"status":"Completed","invoiceNumbers":["INV-000001"]}""",
    "missing success flag" -> """{"status":"Completed","invoiceNumbers":["INV-000001"]}""",
    "invalid success flag" -> """{"success":"true","status":"Completed","invoiceNumbers":["INV-000001"]}""",
    "malformed JSON" -> "not-json",
  ).foreach { case (description, response) =>
    it should s"reject $description without resubmitting the order" in {
      val api = new OrderApi
      api.response = response

      api.cancel().isLeft shouldBe true

      api.calls shouldBe 1
      api.invoiceCalls shouldBe 0
    }
  }

  List(
    "no invoice numbers" -> Json.obj(),
    "an empty invoice list" -> Json.obj("invoiceNumbers" -> List.empty[String]),
    "multiple invoices" -> Json.obj("invoiceNumbers" -> List("INV-000001", "INV-000002")),
    "an empty invoice number" -> Json.obj("invoiceNumbers" -> List("")),
    "a blank invoice number" -> Json.obj("invoiceNumbers" -> List(" ")),
  ).foreach { case (description, invoiceFields) =>
    it should s"reject a completed order returning $description" in {
      val api = new OrderApi
      api.response = Json.stringify(
        Json.obj("success" -> true, "status" -> "Completed", "orderNumber" -> "O-001") ++ invoiceFields,
      )

      api.cancel().isLeft shouldBe true

      api.calls shouldBe 1
      api.invoiceCalls shouldBe 0
    }
  }

  List("Draft", "Pending", "Scheduled", "Failed", "Unknown").foreach { status =>
    it should s"reject a successful HTTP response with order status $status" in {
      val api = new OrderApi
      api.response = s"""{"success":true,"status":"$status","orderNumber":"O-001","invoiceNumbers":["INV-000001"]}"""

      api.cancel().left.value.message shouldBe s"Zuora cancellation order did not complete: $status"
      api.invoiceCalls shouldBe 0
    }
  }

  it should "reject a successful HTTP response without an order status" in {
    val api = new OrderApi
    api.response = """{"success":true,"orderNumber":"O-001","invoiceNumbers":["INV-000001"]}"""

    api.cancel().left.value.message shouldBe "Zuora cancellation order did not complete: missing status"
    api.invoiceCalls shouldBe 0
  }

  it should "reject a completed order without its order number before looking up its invoice" in {
    val api = new OrderApi
    api.response = """{"success":true,"status":"Completed","invoiceNumbers":["INV-000001"]}"""

    api.cancel().left.value.message should include("orderNumber")

    api.invoiceCalls shouldBe 0
  }

  List[JsValue](JsNull, JsNumber(123), JsString(""), JsString(" "), JsString("order-id"), JsString("O-12A")).foreach {
    number =>
      it should s"reject a completed order with invalid order number $number before looking up its invoice" in {
        val api = new OrderApi
        api.response = Json.stringify(
          Json.obj(
            "success" -> true,
            "status" -> "Completed",
            "orderNumber" -> number,
            "invoiceNumbers" -> List("INV-000001"),
          ),
        )

        api.cancel().left.value.message should include("orderNumber")

        api.calls shouldBe 1
        api.invoiceCalls shouldBe 0
      }
  }

  List(404, 429, 500).foreach { status =>
    it should s"surface invoice lookup HTTP $status without resubmitting the order" in {
      val api = new OrderApi
      api.invoiceStatus = status

      api.cancel().isLeft shouldBe true

      api.calls shouldBe 1
      api.invoiceCalls shouldBe 1
    }
  }

  List(
    "a missing ID" -> "{}",
    "an empty ID" -> """{"id":""}""",
    "a blank ID" -> """{"id":" "}""",
    "an invalid ID type" -> """{"id":123}""",
  ).foreach { case (description, response) =>
    it should s"reject an invoice lookup returning $description" in {
      val api = new OrderApi
      api.invoiceResponse = response

      api.cancel().isLeft shouldBe true

      api.calls shouldBe 1
      api.invoiceCalls shouldBe 1
    }
  }
}

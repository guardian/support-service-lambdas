package com.gu.util.zuora

import com.gu.autoCancel.AutoCancel.{AutoCancelRequest, CancellationResponse}
import okhttp3.{MediaType, Protocol, Request, Response, ResponseBody}
import okio.Buffer
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.Json

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
    var response = """{"success":true,"status":"Completed","invoiceIds":["balancing-1"]}"""

    private val requests = ZuoraRestRequestMaker.oauth(
      (httpRequest: Request) => {
        calls += 1
        httpRequest.method() shouldBe "POST"
        httpRequest.url().toString shouldBe "https://rest.test.zuora.com/v1/orders?returnIds=true"
        httpRequest.header("Authorization") shouldBe "Bearer test-access-token"
        httpRequest.header("apiAccessKeyId") shouldBe null
        httpRequest.header("apiSecretAccessKey") shouldBe null
        idempotencyKeys += Option(httpRequest.header("Idempotency-Key")).getOrElse(fail("Missing idempotency key"))
        val buffer = new Buffer()
        httpRequest.body().writeTo(buffer)
        bodies += buffer.readUtf8()
        new Response.Builder()
          .request(httpRequest)
          .protocol(Protocol.HTTP_1_1)
          .code(status)
          .message("scripted response")
          .body(ResponseBody.create(response, MediaType.parse("application/json")))
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

  "ZuoraOrderCancellation" should "cancel synchronously using OAuth and the returned invoice ID without another lookup" in {
    val api = new OrderApi

    api.cancel() shouldBe Right(CancellationResponse("balancing-1"))

    api.calls shouldBe 1
    Json.parse(api.bodies.head) shouldBe orderBody
    api.idempotencyKeys.head should startWith("auto-cancel-")
    api.idempotencyKeys.head.length should be < 255
  }

  it should "reuse the idempotency key on redelivery even if processing and cancellation dates have changed" in {
    val api = new OrderApi

    api.cancel() shouldBe Right(CancellationResponse("balancing-1"))
    api.cancel(
      actualRequest = request.copy(cancellationDate = cancellationDate.minusDays(1)),
      date = orderDate.plusDays(1),
    ) shouldBe Right(CancellationResponse("balancing-1"))

    api.idempotencyKeys.distinct should have size 1
    api.calls shouldBe 2
  }

  it should "use distinct keys for different accounts, subscriptions and source invoices" in {
    val api = new OrderApi

    api.cancel().isRight shouldBe true
    api.cancel(actualRequest = request.copy(accountId = "account-2")).isRight shouldBe true
    api.cancel(actualRequest = request.copy(subToCancel = SubscriptionNumber("A-S002"))).isRight shouldBe true
    api.cancel(sourceInvoiceId = "unpaid-2").isRight shouldBe true

    api.idempotencyKeys.distinct should have size 4
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
  }

  List(409, 429, 500).foreach { status =>
    it should s"surface HTTP $status without resubmitting the order" in {
      val api = new OrderApi
      api.status = status

      api.cancel().isLeft shouldBe true

      api.calls shouldBe 1
    }
  }

  List(
    "success=false" -> """{"success":false,"status":"Completed","invoiceIds":["balancing-1"]}""",
    "missing success flag" -> """{"status":"Completed","invoiceIds":["balancing-1"]}""",
    "invalid success flag" -> """{"success":"true","status":"Completed","invoiceIds":["balancing-1"]}""",
    "malformed JSON" -> "not-json",
  ).foreach { case (description, response) =>
    it should s"reject $description without resubmitting the order" in {
      val api = new OrderApi
      api.response = response

      api.cancel().isLeft shouldBe true

      api.calls shouldBe 1
    }
  }

  List(
    "no invoice IDs" -> Json.obj(),
    "an empty invoice list" -> Json.obj("invoiceIds" -> List.empty[String]),
    "multiple invoices" -> Json.obj("invoiceIds" -> List("invoice-1", "invoice-2")),
    "an empty invoice ID" -> Json.obj("invoiceIds" -> List("")),
    "a blank invoice ID" -> Json.obj("invoiceIds" -> List(" ")),
  ).foreach { case (description, invoiceFields) =>
    it should s"reject a completed order returning $description" in {
      val api = new OrderApi
      api.response = Json.stringify(Json.obj("success" -> true, "status" -> "Completed") ++ invoiceFields)

      api.cancel().isLeft shouldBe true

      api.calls shouldBe 1
    }
  }

  List("Draft", "Pending", "Scheduled", "Failed", "Unknown").foreach { status =>
    it should s"reject a successful HTTP response with order status $status" in {
      val api = new OrderApi
      api.response = s"""{"success":true,"status":"$status","invoiceIds":["balancing-1"]}"""

      api.cancel().left.value.message shouldBe s"Zuora cancellation order did not complete: $status"
    }
  }

  it should "reject a successful HTTP response without an order status" in {
    val api = new OrderApi
    api.response = """{"success":true,"invoiceIds":["balancing-1"]}"""

    api.cancel().left.value.message shouldBe "Zuora cancellation order did not complete: missing status"
  }
}

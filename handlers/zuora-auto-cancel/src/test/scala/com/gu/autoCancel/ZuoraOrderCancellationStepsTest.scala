package com.gu.autoCancel

import com.gu.autoCancel.AutoCancel.{AutoCancelRequest, CancellationResponse}
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.ClientSuccess
import com.gu.util.zuora.{SubscriptionNumber, ZuoraRestRequestMaker}
import com.gu.zuora.{HolidayStopProcessor, HolidayStopProcessorZuoraConfig, Oauth}
import okhttp3.{MediaType, Protocol, Request, Response, ResponseBody}
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.{JsValue, Json}
import sttp.client3.StringBody
import sttp.client3.testing.SttpBackendStub
import sttp.model.StatusCode

import java.time.LocalDate
import scala.collection.mutable.ListBuffer

class ZuoraOrderCancellationStepsTest extends AnyFlatSpec with Matchers with EitherValues {
  private val baseUrl = "https://rest.test.zuora.com"
  private val orderDate = LocalDate.of(2026, 10, 20)
  private val cancellationDate = LocalDate.of(2026, 9, 15)
  private val request = AutoCancelRequest("account-1", SubscriptionNumber("A-S001"), cancellationDate)
  private val config = HolidayStopProcessorZuoraConfig(
    s"$baseUrl/v1",
    HolidayStopProcessor(Oauth("test-client", "test-secret")),
  )
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

  private def deadline(remainingMillis: Int): Deadline = new Deadline {
    override def remainingTimeInMillis: Int = remainingMillis
  }

  private class OrderApi {
    val calls = ListBuffer.empty[String]
    var tokenStatus = 200
    var submissionStatus = 200
    var invoiceStatus = 200
    var report: JsValue = Json.obj(
      "status" -> "Completed",
      "result" -> Json.obj("status" -> "Completed", "invoiceNumbers" -> List("INV-001")),
    )

    private val backend = SttpBackendStub.synchronous.whenRequestMatchesPartial { case httpRequest =>
      val path = httpRequest.uri.path.mkString("/")
      httpRequest.uri.toString shouldBe s"$baseUrl/$path"
      calls += path
      path match {
        case "oauth/token" =>
          httpRequest.method.method shouldBe "POST"
          httpRequest.body match {
            case StringBody(text, _, _) =>
              text shouldBe "grant_type=client_credentials&client_id=test-client&client_secret=test-secret"
            case other => fail(s"Unexpected token request body: $other")
          }
          sttp.client3.Response("""{"access_token":"test-access-token"}""", StatusCode(tokenStatus))
        case "v1/async/orders" =>
          httpRequest.method.method shouldBe "POST"
          httpRequest.body match {
            case StringBody(text, _, _) => Json.parse(text) shouldBe orderBody
            case other => fail(s"Unexpected order request body: $other")
          }
          sttp.client3.Response("""{"success":true,"jobId":"job-1"}""", StatusCode(submissionStatus))
        case "v1/async-jobs/job-1" =>
          httpRequest.method.method shouldBe "GET"
          sttp.client3.Response.ok(Json.stringify(report))
        case other => fail(s"Unexpected Zuora request: $other")
      }
    }

    private val requests = new Requests(
      headers = Map.empty,
      baseUrl = s"$baseUrl/v1/",
      getResponse = (httpRequest: Request) => {
        calls += "invoice lookup"
        httpRequest.method() shouldBe "GET"
        httpRequest.url().toString shouldBe s"$baseUrl/v1/invoices/INV-001"
        new Response.Builder()
          .request(httpRequest)
          .protocol(Protocol.HTTP_1_1)
          .code(invoiceStatus)
          .message("scripted response")
          .body(ResponseBody.create("""{"id":"balancing-1","success":true}""", MediaType.parse("application/json")))
          .build()
      },
      jsonIsSuccessful = ZuoraRestRequestMaker.zuoraIsSuccessful,
    )

    val factory = ZuoraOrderCancellationSteps.factory(requests, config, backend)

    def cancel(remainingMillis: Int = 300000) =
      factory.create(deadline(remainingMillis), orderDate).flatMap(_.cancel(request)).toDisjunction
  }

  "ZuoraOrderCancellationSteps" should "submit the correctly dated order and resolve the generated invoice ID" in {
    val api = new OrderApi

    api.cancel() shouldBe Right(CancellationResponse("balancing-1"))

    api.calls.toList shouldBe List("oauth/token", "v1/async/orders", "v1/async-jobs/job-1", "invoice lookup")
  }

  it should "fail before submitting an order if authentication fails" in {
    val api = new OrderApi
    api.tokenStatus = 401

    api.cancel().isLeft shouldBe true

    api.calls.toList shouldBe List("oauth/token")
  }

  it should "obtain a fresh token when creating another cancellation session" in {
    val api = new OrderApi

    api.factory.create(deadline(300000), orderDate).isFailure shouldBe false
    api.factory.create(deadline(300000), orderDate.plusDays(1)).isFailure shouldBe false

    api.calls.toList shouldBe List("oauth/token", "oauth/token")
  }

  it should "not submit an order when less than the minimum safe time remains" in {
    val api = new OrderApi

    api.cancel(129999).left.value.message shouldBe
      "Not enough Lambda time remains to safely submit the Zuora cancellation order"

    api.calls.toList shouldBe List("oauth/token")
  }

  it should "allow an order at the minimum safe time boundary" in {
    val api = new OrderApi

    api.cancel(130000) shouldBe Right(CancellationResponse("balancing-1"))

    api.calls.toList shouldBe List("oauth/token", "v1/async/orders", "v1/async-jobs/job-1", "invoice lookup")
  }

  it should "read the current deadline before each order rather than retain its initial value" in {
    val api = new OrderApi
    val remainingTimes = Iterator(300000, 129999)
    val liveDeadline = new Deadline {
      override def remainingTimeInMillis: Int = remainingTimes.next()
    }
    val cancellation = api.factory.create(liveDeadline, orderDate).toDisjunction.value

    cancellation.cancel(request) shouldBe ClientSuccess(CancellationResponse("balancing-1"))
    cancellation.cancel(request).toDisjunction.left.value.message shouldBe
      "Not enough Lambda time remains to safely submit the Zuora cancellation order"

    remainingTimes.hasNext shouldBe false
    api.calls.toList shouldBe List("oauth/token", "v1/async/orders", "v1/async-jobs/job-1", "invoice lookup")
  }

  it should "propagate a failed order submission without polling or looking up invoices" in {
    val api = new OrderApi
    api.submissionStatus = 500

    api.cancel().left.value.message should startWith("Failed to submit Zuora order:")

    api.calls.toList shouldBe List("oauth/token", "v1/async/orders")
  }

  it should "propagate a failed order job without looking up invoices" in {
    val api = new OrderApi
    api.report = Json.obj("status" -> "Failed", "errors" -> "Cancellation rejected")

    api.cancel().left.value.message shouldBe "Zuora order job job-1 failed: Cancellation rejected"

    api.calls.toList shouldBe List("oauth/token", "v1/async/orders", "v1/async-jobs/job-1")
  }

  List(
    "no invoice numbers" -> Json.obj("status" -> "Completed"),
    "an empty invoice list" -> Json.obj("status" -> "Completed", "invoiceNumbers" -> List.empty[String]),
    "multiple invoices" -> Json.obj("status" -> "Completed", "invoiceNumbers" -> List("INV-001", "INV-002")),
  ).foreach { case (description, result) =>
    it should s"reject an order returning $description before looking up invoices" in {
      val api = new OrderApi
      api.report = Json.obj("status" -> "Completed", "result" -> result)

      api.cancel().isLeft shouldBe true

      api.calls.toList shouldBe List("oauth/token", "v1/async/orders", "v1/async-jobs/job-1")
    }
  }

  it should "propagate a failed invoice lookup" in {
    val api = new OrderApi
    api.invoiceStatus = 500

    api.cancel().left.value.message shouldBe "HTTP request was unsuccessful"

    api.calls.toList shouldBe List("oauth/token", "v1/async/orders", "v1/async-jobs/job-1", "invoice lookup")
  }
}

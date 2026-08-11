package com.gu.zuora

import com.gu.zuora.orders._
import com.gu.zuora.subscription.ZuoraApiResponse
import io.circe.generic.auto._
import io.circe.parser.decode
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import sttp.client3.testing.SttpBackendStub
import sttp.client3.{Request, Response, StringBody}
import sttp.model.Method

import java.time.LocalDate
import java.util.concurrent.atomic.AtomicInteger
import scala.collection.mutable.ListBuffer

class ZuoraOrdersTest extends AnyFlatSpec with Matchers with EitherValues {
  private val config = new ZuoraConfig {
    override val baseUrl: String = "https://rest.test.eu.zuora.com/v1"
  }
  private val accessToken = AccessToken("access-token")
  private val request = CreateOrderRequest(
    orderDate = LocalDate.parse("2026-08-11"),
    existingAccountNumber = "A000001",
    subscriptions = Nil,
    processingOptions = ProcessingOptions(runBilling = false, collectPayment = false),
  )

  "createOrderAsynchronously" should "submit the order and wait until both the job and order complete" in {
    val jobReads = new AtomicInteger(0)
    val requests = ListBuffer.empty[(Method, String, Option[String])]
    val backend = SttpBackendStub.synchronous.whenRequestMatchesPartial {
      case submittedRequest: Request[_, _] if submittedRequest.method == Method.POST =>
        requests += requestDetails(submittedRequest)
        Response.ok("""{"jobId":"job-1","success":true}""")
      case statusRequest: Request[_, _] if statusRequest.method == Method.GET =>
        requests += requestDetails(statusRequest)
        val response =
          if (jobReads.getAndIncrement() == 0)
            """{"status":"Processing","errors":null,"result":null}"""
          else
            """{"status":"Completed","errors":null,"result":{"status":"Completed"}}"""
        Response.ok(response)
    }

    val result = ZuoraOrders.createOrderAsynchronously(
      config,
      accessToken,
      backend,
      pause = () => (),
      maxPollAttempts = 2,
    )(request)

    result shouldBe Right(())
    requests.toList shouldBe List(
      (Method.POST, "https://rest.test.eu.zuora.com/v1/async/orders", Some("Bearer access-token")),
      (Method.GET, "https://rest.test.eu.zuora.com/v1/async-jobs/job-1", Some("Bearer access-token")),
      (Method.GET, "https://rest.test.eu.zuora.com/v1/async-jobs/job-1", Some("Bearer access-token")),
    )
  }

  it should "fail if Zuora accepts the request without returning a job ID" in {
    val backend = SttpBackendStub.synchronous.whenAnyRequest.thenRespond("""{"success":true}""")

    val result = ZuoraOrders.createOrderAsynchronously(config, accessToken, backend)(request)

    result.left.value.reason shouldBe "Zuora accepted the order without returning a job ID"
  }

  "waitForCompletion" should "fail when the job completes without a completed order" in {
    val result = waitFor(
      AsyncJobReport(
        status = AsyncJobStatus.Completed,
        errors = None,
        result = Some(AsyncOrderResult(OrderStatus.Pending)),
      ),
    )

    result.left.value.reason shouldBe "Zuora order job job-1 completed with order status Pending"
  }

  it should "return the job error when Zuora reports a failure" in {
    val result = waitFor(
      AsyncJobReport(
        status = AsyncJobStatus.Failed,
        errors = Some("The order could not be applied"),
        result = None,
      ),
    )

    result.left.value.reason shouldBe "Zuora order job job-1 failed: The order could not be applied"
  }

  it should "stop after the configured number of polls" in {
    val reads = new AtomicInteger(0)
    val result = ZuoraOrders.waitForCompletion(
      jobId = "job-1",
      getReport = _ => {
        reads.incrementAndGet()
        Right(AsyncJobReport(AsyncJobStatus.Processing, None, None))
      },
      pause = () => (),
      maxPollAttempts = 2,
    )

    result.left.value.reason shouldBe "Timed out waiting for Zuora order job job-1"
    reads.get() shouldBe 2
  }

  it should "reject an unknown job status" in {
    val result = decode[AsyncJobReport]("""{"status":"Unknown","errors":null,"result":null}""")

    result.left.value.getMessage should include("Unknown Zuora async job status: Unknown")
  }

  private def waitFor(report: AsyncJobReport): ZuoraApiResponse[Unit] =
    ZuoraOrders.waitForCompletion(
      jobId = "job-1",
      getReport = _ => Right(report),
      pause = () => (),
      maxPollAttempts = 1,
    )

  private def requestDetails(request: Request[_, _]): (Method, String, Option[String]) = {
    val body = request.body match {
      case StringBody(bodyValue, _, _) => Some(bodyValue)
      case _ => None
    }
    body.foreach(_ should include("\"existingAccountNumber\":\"A000001\""))
    (
      request.method,
      request.uri.toString,
      request.headers.find(_.name.equalsIgnoreCase("Authorization")).map(_.value),
    )
  }
}

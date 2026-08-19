package com.gu.zuora

import com.gu.zuora.orders._
import com.gu.zuora.subscription.ZuoraApiFailure
import io.circe.generic.auto._
import io.circe.parser.decode
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import sttp.client3.testing.SttpBackendStub
import sttp.client3.{Identity, Request, Response, SttpBackend, StringBody}
import sttp.model.Method

import java.time.LocalDate
import java.util.concurrent.atomic.{AtomicInteger, AtomicLong}
import scala.collection.mutable.ListBuffer
import scala.concurrent.duration.{DurationInt, FiniteDuration}

class ZuoraOrdersTest extends AnyFlatSpec with Matchers with EitherValues {
  private val config = new ZuoraConfig {
    override val baseUrl: String = "https://rest.test.eu.zuora.com/v1"
  }
  private val accessToken = AccessToken("access-token")
  private val request = CreateOrderRequest(
    orderDate = LocalDate.parse("2026-08-11"),
    existingAccount = ExistingAccount.Number("A000001"),
    subscriptions = Nil,
    processingOptions = ProcessingOptions(runBilling = false, collectPayment = false),
  )

  "createOrderAsynchronously" should "submit the order and wait until both the job and order complete" in {
    val clock = new AtomicLong(0)
    val jobReads = new AtomicInteger(0)
    val requests = ListBuffer.empty[(Method, String, Option[String])]
    val backend = SttpBackendStub.synchronous.whenRequestMatchesPartial {
      case submittedRequest: Request[_, _] if submittedRequest.method == Method.POST =>
        submittedRequest.options.readTimeout shouldBe 2.minutes
        requests += requestDetails(submittedRequest)
        Response.ok("""{"jobId":"job-1","success":true}""")
      case statusRequest: Request[_, _] if statusRequest.method == Method.GET =>
        statusRequest.options.readTimeout shouldBe 2.minutes
        requests += requestDetails(statusRequest)
        val response =
          if (jobReads.getAndIncrement() == 0)
            """{"status":"Processing","errors":null,"result":null}"""
          else
            """{"status":"Completed","errors":null,"result":{"status":"Completed","invoiceNumbers":["INV-000001"]}}"""
        Response.ok(response)
    }

    val result = createOrder(backend, clock)(request)

    result shouldBe Right(AsyncOrderResult(OrderStatus.Completed, Some(List("INV-000001"))))
    requests.toList shouldBe List(
      (Method.POST, "https://rest.test.eu.zuora.com/v1/async/orders", Some("Bearer access-token")),
      (Method.GET, "https://rest.test.eu.zuora.com/v1/async-jobs/job-1", Some("Bearer access-token")),
      (Method.GET, "https://rest.test.eu.zuora.com/v1/async-jobs/job-1", Some("Bearer access-token")),
    )
  }

  it should "reject an accepted response without a job ID without resubmitting" in {
    val submissions = new AtomicInteger(0)
    val backend = SttpBackendStub.synchronous.whenRequestMatchesPartial { case _ =>
      submissions.incrementAndGet()
      Response.ok("""{"success":true}""")
    }

    val result = createOrder(backend, new AtomicLong(0))(request)

    result.left.value.reason should startWith("Failed to submit Zuora order:")
    result.left.value.reason should include("Zuora accepted the order without returning a job ID")
    submissions.get() shouldBe 1
  }

  it should "not resubmit after an ambiguous submission response" in {
    val submissions = new AtomicInteger(0)
    val backend = SttpBackendStub.synchronous.whenRequestMatchesPartial { case _ =>
      submissions.incrementAndGet()
      Response.ok("not-json")
    }

    val result = createOrder(backend, new AtomicLong(0))(request)

    result.left.value.reason should startWith("Failed to submit Zuora order:")
    submissions.get() shouldBe 1
  }

  it should "fail when Zuora rejects the submission" in {
    val submissions = new AtomicInteger(0)
    val backend = SttpBackendStub.synchronous.whenRequestMatchesPartial { case _ =>
      submissions.incrementAndGet()
      Response.ok("""{"success":false}""")
    }

    val result = createOrder(backend, new AtomicLong(0))(request)

    result.left.value.reason shouldBe "Zuora did not accept the order"
    submissions.get() shouldBe 1
  }

  it should "retry when the job report confirms locking contention" in {
    val clock = new AtomicLong(0)
    val submissions = new AtomicInteger(0)
    val backend = SttpBackendStub.synchronous.whenRequestMatchesPartial {
      case submittedRequest: Request[_, _] if submittedRequest.method == Method.POST =>
        val attempt = submissions.incrementAndGet()
        Response.ok(s"""{"jobId":"job-$attempt","success":true}""")
      case statusRequest: Request[_, _] if statusRequest.method == Method.GET && submissions.get() == 1 =>
        Response.ok(
          """{"status":"Failed","errors":"[40000050]: Operation failed due to a lock competition, please retry later.","result":null}""",
        )
      case statusRequest: Request[_, _] if statusRequest.method == Method.GET =>
        Response.ok("""{"status":"Completed","errors":null,"result":{"status":"Completed"}}""")
    }

    val result = createOrder(backend, clock)(request)

    result shouldBe Right(AsyncOrderResult(OrderStatus.Completed))
    submissions.get() shouldBe 2
    clock.get() shouldBe 1.minute.toNanos
  }

  it should "stop after two locking contention failures" in {
    val clock = new AtomicLong(0)
    val submissions = new AtomicInteger(0)
    val backend = SttpBackendStub.synchronous.whenRequestMatchesPartial {
      case submittedRequest: Request[_, _] if submittedRequest.method == Method.POST =>
        val attempt = submissions.incrementAndGet()
        Response.ok(s"""{"jobId":"job-$attempt","success":true}""")
      case statusRequest: Request[_, _] if statusRequest.method == Method.GET =>
        Response.ok(
          """{"status":"Failed","errors":"[40000050]: Operation failed due to a lock competition, please retry later.","result":null}""",
        )
    }

    val result = createOrder(backend, clock)(request)

    result.left.value.reason shouldBe
      "Zuora order job job-2 failed: [40000050]: Operation failed due to a lock competition, please retry later."
    submissions.get() shouldBe 2
    clock.get() shouldBe 1.minute.toNanos
  }

  it should "not retry other job failures" in {
    val submissions = new AtomicInteger(0)
    val backend = SttpBackendStub.synchronous.whenRequestMatchesPartial {
      case submittedRequest: Request[_, _] if submittedRequest.method == Method.POST =>
        submissions.incrementAndGet()
        Response.ok("""{"jobId":"job-1","success":true}""")
      case statusRequest: Request[_, _] if statusRequest.method == Method.GET =>
        Response.ok("""{"status":"Failed","errors":"The order could not be applied","result":null}""")
    }

    val result = createOrder(backend, new AtomicLong(0))(request)

    result.left.value.reason shouldBe "Zuora order job job-1 failed: The order could not be applied"
    submissions.get() shouldBe 1
  }

  it should "retry an ambiguous job status response without resubmitting" in {
    val submissions = new AtomicInteger(0)
    val jobReads = new AtomicInteger(0)
    val backend = SttpBackendStub.synchronous.whenRequestMatchesPartial {
      case submittedRequest: Request[_, _] if submittedRequest.method == Method.POST =>
        submissions.incrementAndGet()
        Response.ok("""{"jobId":"job-1","success":true}""")
      case statusRequest: Request[_, _] if statusRequest.method == Method.GET =>
        if (jobReads.getAndIncrement() == 0) Response.ok("not-json")
        else Response.ok("""{"status":"Completed","errors":null,"result":{"status":"Completed"}}""")
    }

    val result = createOrder(backend, new AtomicLong(0))(request)

    result shouldBe Right(AsyncOrderResult(OrderStatus.Completed))
    submissions.get() shouldBe 1
    jobReads.get() shouldBe 2
  }

  it should "include submission time in the order deadline" in {
    val clock = new AtomicLong(0)
    val submissions = new AtomicInteger(0)
    val jobReads = new AtomicInteger(0)
    val backend = SttpBackendStub.synchronous.whenRequestMatchesPartial {
      case submittedRequest: Request[_, _] if submittedRequest.method == Method.POST =>
        submissions.incrementAndGet()
        clock.addAndGet(6.minutes.toNanos)
        Response.ok("""{"jobId":"job-1","success":true}""")
      case statusRequest: Request[_, _] if statusRequest.method == Method.GET =>
        jobReads.incrementAndGet()
        Response.ok("""{"status":"Completed","errors":null,"result":{"status":"Completed"}}""")
    }

    val result = createOrder(backend, clock, 5.minutes)(request)

    result.left.value.reason shouldBe "Timed out waiting for Zuora order job job-1"
    submissions.get() shouldBe 1
    jobReads.get() shouldBe 0
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

  it should "fail when the job completes without an order result" in {
    val result = waitFor(AsyncJobReport(AsyncJobStatus.Completed, None, None))

    result.left.value.reason shouldBe "Zuora order job job-1 completed with order status missing"
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

  it should "explain when a failed job has no error" in {
    val result = waitFor(AsyncJobReport(AsyncJobStatus.Failed, None, None))

    result.left.value.reason shouldBe "Zuora order job job-1 failed: no reason returned"
  }

  it should "accept a completed job status read at the deadline" in {
    val clock = new AtomicLong(0)
    val reads = new AtomicInteger(0)
    val result = ZuoraOrders.waitForCompletion(
      jobId = "job-1",
      getReport = (_, _) => {
        reads.incrementAndGet()
        clock.addAndGet(6.seconds.toNanos)
        Right(AsyncJobReport(AsyncJobStatus.Completed, None, Some(AsyncOrderResult(OrderStatus.Completed))))
      },
      pause = _ => (),
      deadlineNanos = 5.seconds.toNanos,
      monotonicNanos = () => clock.get(),
    )

    result shouldBe Right(AsyncOrderResult(OrderStatus.Completed))
    reads.get() shouldBe 1
  }

  it should "retry a failed job status read until the job completes" in {
    val clock = new AtomicLong(0)
    val reads = new AtomicInteger(0)
    val result = ZuoraOrders.waitForCompletion(
      jobId = "job-1",
      getReport = (_, _) =>
        if (reads.getAndIncrement() == 0) Left(ZuoraApiFailure("temporary network error"))
        else Right(AsyncJobReport(AsyncJobStatus.Completed, None, Some(AsyncOrderResult(OrderStatus.Completed)))),
      pause = duration => {
        clock.addAndGet(duration.toNanos)
        ()
      },
      deadlineNanos = 5.seconds.toNanos,
      monotonicNanos = () => clock.get(),
    )

    result shouldBe Right(AsyncOrderResult(OrderStatus.Completed))
    reads.get() shouldBe 2
  }

  it should "stop polling at the deadline and shorten the final pause" in {
    val clock = new AtomicLong(0)
    val reads = new AtomicInteger(0)
    val pauses = ListBuffer.empty[FiniteDuration]
    val result = ZuoraOrders.waitForCompletion(
      jobId = "job-1",
      getReport = (_, _) => {
        reads.incrementAndGet()
        Right(AsyncJobReport(AsyncJobStatus.Processing, None, None))
      },
      pause = duration => {
        pauses += duration
        clock.addAndGet(duration.toNanos)
        ()
      },
      deadlineNanos = 5.seconds.toNanos,
      monotonicNanos = () => clock.get(),
    )

    result.left.value.reason shouldBe "Timed out waiting for Zuora order job job-1"
    reads.get() shouldBe 3
    pauses.toList shouldBe List(2.seconds, 2.seconds, 1.second)
  }

  it should "cap each status request at the explicit read timeout" in {
    val readTimeouts = ListBuffer.empty[FiniteDuration]
    val result = ZuoraOrders.waitForCompletion(
      jobId = "job-1",
      getReport = (_, readTimeout) => {
        readTimeouts += readTimeout
        Right(AsyncJobReport(AsyncJobStatus.Completed, None, Some(AsyncOrderResult(OrderStatus.Completed))))
      },
      pause = _ => (),
      deadlineNanos = 5.minutes.toNanos,
      monotonicNanos = () => 0,
    )

    result shouldBe Right(AsyncOrderResult(OrderStatus.Completed))
    readTimeouts.toList shouldBe List(2.minutes)
  }

  it should "reject an unknown job status" in {
    val result = decode[AsyncJobReport]("""{"status":"Unknown","errors":null,"result":null}""")

    result.left.value.getMessage should include("Unknown Zuora async job status: Unknown")
  }

  it should "reject an unknown order status" in {
    val result = decode[AsyncJobReport](
      """{"status":"Completed","errors":null,"result":{"status":"Unknown"}}""",
    )

    result.left.value.getMessage should include("Unknown Zuora order status: Unknown")
  }

  private def createOrder(
      backend: SttpBackend[Identity, Any],
      clock: AtomicLong,
      maxOrderDuration: FiniteDuration = ZuoraOrders.MaximumOrderDuration,
  )(request: CreateOrderRequest) =
    ZuoraOrders.createOrderAsynchronously(
      config,
      accessToken,
      backend,
      pause = duration => {
        clock.addAndGet(duration.toNanos)
        ()
      },
      monotonicNanos = () => clock.get(),
      maximumOrderDuration = maxOrderDuration,
    )(request)

  private def waitFor(report: AsyncJobReport): Either[ZuoraOrders.OrderFailure, AsyncOrderResult] =
    ZuoraOrders.waitForCompletion(
      jobId = "job-1",
      getReport = (_, _) => Right(report),
      pause = _ => (),
      deadlineNanos = 1.minute.toNanos,
      monotonicNanos = () => 0,
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

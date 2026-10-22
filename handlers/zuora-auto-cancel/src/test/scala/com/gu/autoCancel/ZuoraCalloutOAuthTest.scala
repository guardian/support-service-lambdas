package com.gu.autoCancel

import com.amazonaws.services.lambda.runtime.{ClientContext, CognitoIdentity, Context, LambdaLogger}
import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.gu.util.apigateway.Auth.TrustedApiConfig
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.config.Stage
import com.gu.util.email.{EmailMessage, EmailSender}
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import com.gu.util.zuora.{ZuoraGetAccessToken, ZuoraOAuthConfig}
import okhttp3.{MediaType, Protocol, Request, Response, ResponseBody}
import okio.Buffer
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.Json

import java.time.LocalDate
import scala.collection.mutable.ListBuffer
import scala.jdk.CollectionConverters._
import scala.util.Try

class ZuoraCalloutOAuthTest extends AnyFlatSpec with Matchers with EitherValues {
  private val date = LocalDate.of(2026, 10, 20)
  private val config = ZuoraOAuthConfig("test-client", "test-secret")
  private val callout = AutoCancelInputFilterTest
    .fakeCallout(true)
    .copy(
      accountId = "account-1",
      invoiceId = "unpaid-1",
    )
  private val invoiceItem = Json.obj(
    "id" -> "item-1",
    "subscriptionName" -> "A-S001",
    "serviceStartDate" -> "2026-09-15",
    "serviceEndDate" -> "2026-10-14",
    "chargeAmount" -> 20,
    "taxAmount" -> 0,
    "chargeName" -> "Subscription",
    "productName" -> "Supporter Plus",
  )
  private val success = Json.obj("success" -> true)
  private val transactions = success ++ Json.obj(
    "invoices" -> Json.arr(
      Json.obj(
        "id" -> "balancing-1",
        "invoiceDate" -> date.toString,
        "amount" -> -20,
        "balance" -> -20,
        "status" -> "Posted",
        "invoiceItems" -> Json.arr(),
      ),
      Json.obj(
        "id" -> "unpaid-1",
        "invoiceDate" -> "2026-09-15",
        "amount" -> 20,
        "balance" -> 20,
        "status" -> "Posted",
        "invoiceItems" -> Json.arr(invoiceItem),
      ),
    ),
  )
  private val account = success ++ Json.obj(
    "basicInfo" -> Json.obj(
      "id" -> "account-1",
      "balance" -> 20,
      "defaultPaymentMethod" -> Json.obj("id" -> "payment-method"),
    ),
    "subscriptions" -> Json.arr(Json.obj("id" -> "sub-1", "subscriptionNumber" -> "A-S001", "status" -> "Active")),
    "invoices" -> Json.arr(
      Json.obj("id" -> "unpaid-1", "dueDate" -> "2026-09-15", "balance" -> 20, "status" -> "Posted"),
    ),
  )

  private class Api {
    var tokenRequests = 0
    var tokenStatus = 200
    var apiStatus = 200
    var trustedConfigLoads = 0
    var tokenProviderBuilds = 0
    var failFirstConfig = false
    var failFirstTokenProvider = false
    var currentDate: LocalDate = date
    var failedPath: Option[String] = None
    var failEmailInvoiceRead = false
    var subscriptionStatus = "Active"
    var emailResult: ClientFailableOp[Unit] = ClientSuccess(())
    val apiRequests = ListBuffer.empty[(String, String, String)]
    val emails = ListBuffer.empty[EmailMessage]
    val emailRequestCounts = ListBuffer.empty[Int]
    val orderDates = ListBuffer.empty[String]

    private def respond(request: Request, body: String, status: Int): Response =
      new Response.Builder()
        .request(request)
        .protocol(Protocol.HTTP_1_1)
        .code(status)
        .message("scripted response")
        .body(ResponseBody.create(body, MediaType.parse("application/json")))
        .build()

    private def response(request: Request): Response = {
      request.url().host() shouldBe "rest.apisandbox.zuora.com"
      val path = request.url().encodedPath()
      if (path == "/oauth/token") {
        request.method() shouldBe "POST"
        tokenRequests += 1
        val body =
          if (tokenStatus == 200) s"""{"access_token":"token-$tokenRequests"}"""
          else """{"error":"invalid_client"}"""
        respond(request, body, tokenStatus)
      } else {
        val token = s"Bearer token-$tokenRequests"
        request.header("Authorization") shouldBe token
        request.header("apiAccessKeyId") shouldBe null
        request.header("apiSecretAccessKey") shouldBe null
        if (path != "/v1/orders") request.header("Idempotency-Key") shouldBe null
        apiRequests += ((request.method(), path, token))
        val body = (request.method(), path) match {
          case ("GET", "/v1/accounts/account-1/summary") => account
          case ("GET", "/v1/invoices/unpaid-1/items") =>
            success ++ Json.obj("invoiceItems" -> Json.arr(invoiceItem))
          case ("GET", "/v1/subscriptions/accounts/account-1") =>
            request.url().queryParameter("pageSize") shouldBe "40"
            success ++ Json.obj(
              "subscriptions" -> Json.arr(Json.obj("subscriptionNumber" -> "A-S001", "status" -> subscriptionStatus)),
            )
          case ("PUT", "/v1/subscriptions/A-S001") => success
          case ("POST", "/v1/orders") =>
            request.url().queryParameter("returnIds") shouldBe "true"
            Option(request.header("Idempotency-Key")) should not be empty
            val buffer = new Buffer()
            request.body().writeTo(buffer)
            orderDates += (Json.parse(buffer.readUtf8()) \ "orderDate").as[String]
            success ++ Json.obj("status" -> "Completed", "invoiceIds" -> List("balancing-1"))
          case ("GET", "/v1/transactions/invoices/accounts/account-1") => transactions
          case ("POST", "/v1/object/credit-balance-adjustment") => success
          case other => fail(s"Unexpected API request: $other")
        }
        val emailInvoiceFailure =
          failEmailInvoiceRead &&
            path == "/v1/transactions/invoices/accounts/account-1" &&
            apiRequests.count(_._2 == path) == 2
        val status = if (failedPath.contains(path) || emailInvoiceFailure) 500 else apiStatus
        respond(request, Json.stringify(body), status)
      }
    }

    val handler = new AutoCancelSqsHandler(
      trustedConfig = {
        trustedConfigLoads += 1
        if (failFirstConfig && trustedConfigLoads == 1) throw ConfigFailure("Temporary configuration failure")
        TrustedApiConfig("test-token", "test-tenant")
      },
      tokenProvider = {
        tokenProviderBuilds += 1
        if (failFirstTokenProvider && tokenProviderBuilds == 1)
          throw ConfigFailure("Temporary OAuth configuration failure")
        new ZuoraGetAccessToken(config, "CODE", Api.this.response)
      },
      emailService = new EmailSender {
        override def send(message: EmailMessage): ClientFailableOp[Unit] = {
          emails += message
          emailRequestCounts += apiRequests.size
          emailResult
        }
      },
      dateProvider = new Today {
        override def today: LocalDate = currentDate
      },
      response = Api.this.response,
      stage = Stage("CODE"),
    )

    def execute(value: AutoCancelCallout = callout, apiToken: String = "test-token", count: Int = 1) =
      Try(handler.handleRequest(event(value, apiToken, count), context)).toEither
  }

  private val context = new Context {
    override def getRemainingTimeInMillis: Int = fail("Unexpected Lambda deadline lookup")
    override def getAwsRequestId: String = "test-request"
    override def getLogGroupName: String = "test-log-group"
    override def getLogStreamName: String = "test-log-stream"
    override def getFunctionName: String = "test-function"
    override def getFunctionVersion: String = "test-version"
    override def getInvokedFunctionArn: String = "test-function-arn"
    override def getMemoryLimitInMB: Int = 1024
    override def getIdentity: CognitoIdentity = fail("Unexpected identity lookup")
    override def getClientContext: ClientContext = fail("Unexpected client context lookup")
    override def getLogger: LambdaLogger = fail("Unexpected Lambda logger lookup")
  }

  private def event(
      value: AutoCancelCallout = callout,
      apiToken: String = "test-token",
      count: Int,
  ): SQSEvent = {
    val records = (1 to count).map { index =>
      val record = new SQSEvent.SQSMessage()
      record.setMessageId(s"message-$index")
      record.setBody(
        Json.stringify(
          Json.obj(
            "queryStringParameters" -> Json.obj("apiToken" -> apiToken),
            "body" -> Json.stringify(Json.toJson(value)(Json.writes[AutoCancelCallout])),
          ),
        ),
      )
      record
    }
    val sqsEvent = new SQSEvent()
    sqsEvent.setRecords(records.asJava)
    sqsEvent
  }

  "Callout OAuth" should "fetch one token per callout and share it across every operation without leaking it to the next callout" in {
    val api = new Api

    api.execute(count = 2) shouldBe Right(())
    api.execute() shouldBe Right(())

    api.tokenRequests shouldBe 3
    api.trustedConfigLoads shouldBe 1
    api.tokenProviderBuilds shouldBe 1
    api.apiRequests.groupMapReduce(_._3)(_ => 1)(_ + _) shouldBe
      Map("Bearer token-1" -> 9, "Bearer token-2" -> 9, "Bearer token-3" -> 9)
    api.apiRequests.map { case (method, path, _) => method -> path }.toSet shouldBe Set(
      "GET" -> "/v1/accounts/account-1/summary",
      "GET" -> "/v1/invoices/unpaid-1/items",
      "GET" -> "/v1/subscriptions/accounts/account-1",
      "PUT" -> "/v1/subscriptions/A-S001",
      "POST" -> "/v1/orders",
      "GET" -> "/v1/transactions/invoices/accounts/account-1",
      "POST" -> "/v1/object/credit-balance-adjustment",
    )
    api.emails should have size 3
    api.emailRequestCounts.toList shouldBe List(9, 18, 27)
    api.apiRequests.take(9).map { case (method, path, _) => method -> path }.toList shouldBe List(
      "GET" -> "/v1/accounts/account-1/summary",
      "GET" -> "/v1/invoices/unpaid-1/items",
      "GET" -> "/v1/subscriptions/accounts/account-1",
      "PUT" -> "/v1/subscriptions/A-S001",
      "POST" -> "/v1/orders",
      "GET" -> "/v1/transactions/invoices/accounts/account-1",
      "POST" -> "/v1/object/credit-balance-adjustment",
      "POST" -> "/v1/object/credit-balance-adjustment",
      "GET" -> "/v1/transactions/invoices/accounts/account-1",
    )
  }

  it should "stop if token acquisition fails and obtain a fresh token for a later callout" in {
    val api = new Api
    api.tokenStatus = 401

    api.execute().left.value.getMessage should include("Failed to process 1 message(s)")
    api.tokenRequests shouldBe 1
    api.apiRequests shouldBe empty
    api.emails shouldBe empty

    api.tokenStatus = 200
    api.execute() shouldBe Right(())

    api.tokenRequests shouldBe 2
    api.apiRequests.map(_._3).toSet shouldBe Set("Bearer token-2")
    api.emails should have size 1
  }

  it should "propagate a permission failure without fetching another token within that callout" in {
    val api = new Api
    api.apiStatus = 403

    api.execute().left.value.getMessage should include("Failed to process 1 message(s)")

    api.tokenRequests shouldBe 1
    api.apiRequests should have size 1
    api.emails shouldBe empty
  }

  it should "not request a token for untrusted or AutoPay-disabled callouts" in {
    val api = new Api

    api.execute(apiToken = "invalid-token").left.value.getMessage should include("401")
    api.execute(callout.copy(autoPay = "false")) shouldBe Right(())

    api.tokenRequests shouldBe 0
    api.tokenProviderBuilds shouldBe 0
    api.apiRequests shouldBe empty
  }

  it should "acknowledge a callout without cancelling or emailing when no invoice subscriptions are active" in {
    val api = new Api
    api.subscriptionStatus = "Cancelled"

    api.execute() shouldBe Right(())

    api.tokenRequests shouldBe 1
    api.apiRequests should have size 3
    api.emails shouldBe empty
  }

  List(
    "cancellation reason update" -> "/v1/subscriptions/A-S001",
    "cancellation order" -> "/v1/orders",
    "credit transfer" -> "/v1/object/credit-balance-adjustment",
  ).foreach { case (description, path) =>
    it should s"fail the callout without sending an email when the $description fails" in {
      val api = new Api
      api.failedPath = Some(path)

      api.execute().left.value.getMessage should include("Failed to process 1 message(s)")

      api.tokenRequests shouldBe 1
      api.apiRequests.last._2 shouldBe path
      api.apiRequests.count(_._2 == path) shouldBe 1
      api.emails shouldBe empty
    }
  }

  it should "fail without sending an email when reading the email's invoice data fails after credit processing" in {
    val api = new Api
    api.failEmailInvoiceRead = true

    api.execute().left.value.getMessage should include("Failed to process 1 message(s)")

    api.apiRequests should have size 9
    api.apiRequests.count(_._2 == "/v1/object/credit-balance-adjustment") shouldBe 2
    api.emails shouldBe empty
  }

  it should "surface an email failure after completing credit processing without retrying the send" in {
    val api = new Api
    api.emailResult = GenericError("Queue unavailable")

    api.execute().left.value.getMessage should include("Failed to process 1 message(s)")

    api.apiRequests should have size 9
    api.emails should have size 1
    api.emailRequestCounts.toList shouldBe List(9)
    api.tokenRequests shouldBe 1
  }

  it should "continue processing records after failures and use the date of each new invocation" in {
    val api = new Api
    api.apiStatus = 500

    api.execute(count = 2).left.value.getMessage should include("Failed to process 2 message(s)")
    api.emails shouldBe empty

    api.apiStatus = 200
    api.currentDate = date.plusDays(1)
    api.execute() shouldBe Right(())

    api.trustedConfigLoads shouldBe 1
    api.tokenProviderBuilds shouldBe 1
    api.tokenRequests shouldBe 3
    api.orderDates.toList shouldBe List(date.plusDays(1).toString)
    api.emails should have size 1
  }

  it should "process later records after a malformed message and still report the batch failure" in {
    val api = new Api
    val batch = event(count = 2)
    batch.getRecords.get(0).setBody("invalid JSON")

    val error = intercept[RuntimeException] {
      api.handler.handleRequest(batch, context)
    }

    error.getMessage should include("Failed to process 1 message(s)")
    api.tokenRequests shouldBe 1
    api.emails should have size 1
  }

  it should "retry a failed configuration load instead of caching its failure" in {
    val api = new Api
    api.failFirstConfig = true
    val disabledCallout = callout.copy(autoPay = "false")

    api.execute(disabledCallout, count = 2).left.value.getMessage should include("Failed to process 1 message(s)")
    api.trustedConfigLoads shouldBe 2

    api.execute(disabledCallout) shouldBe Right(())

    api.trustedConfigLoads shouldBe 2
    api.tokenProviderBuilds shouldBe 0
    api.tokenRequests shouldBe 0
    api.apiRequests shouldBe empty
  }

  it should "not initialise configuration or services for an empty batch" in {
    val api = new Api

    api.execute(count = 0) shouldBe Right(())

    api.trustedConfigLoads shouldBe 0
    api.tokenProviderBuilds shouldBe 0
    api.tokenRequests shouldBe 0
  }

  it should "retain the public AWS no-argument constructor without eagerly loading live services" in {
    val handler = classOf[AutoCancelSqsHandler].getConstructor().newInstance()

    handler.handleRequest(event(count = 0), context)
  }

  it should "retry failed OAuth service initialisation and then reuse the successfully initialised service" in {
    val api = new Api
    api.failFirstTokenProvider = true

    api.execute(count = 2).left.value.getMessage should include("Failed to process 1 message(s)")
    api.tokenProviderBuilds shouldBe 2
    api.tokenRequests shouldBe 1
    api.emails should have size 1

    api.execute() shouldBe Right(())

    api.trustedConfigLoads shouldBe 1
    api.tokenProviderBuilds shouldBe 2
    api.tokenRequests shouldBe 2
    api.emails should have size 2
  }
}

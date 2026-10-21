package com.gu.autoCancel

import com.amazonaws.services.lambda.runtime.{ClientContext, CognitoIdentity, Context, LambdaLogger}
import com.amazonaws.services.lambda.runtime.events.SQSEvent
import com.gu.autoCancel.AutoCancel.AutoCancelRequest
import com.gu.util.apigateway.ApiGatewayResponse.{internalServerError, noActionRequired, unauthorized}
import com.gu.util.apigateway.Auth.TrustedApiConfig
import com.gu.util.config.ConfigReads.ConfigFailure
import com.gu.util.email.{EmailMessage, EmailSender}
import com.gu.util.resthttp.RestRequestMaker.Requests
import com.gu.util.resthttp.Types.{ClientFailableOp, ClientSuccess, GenericError}
import com.gu.util.zuora.{
  SubscriptionNumber,
  ApplyCreditBalance,
  TransferToCreditBalance,
  ZuoraGetAccountSubscriptions,
  ZuoraGetAccountSummary,
  ZuoraGetInvoiceTransactions,
  ZuoraGetSubsNamesOnInvoice,
  ZuoraRestRequestMaker,
  ZuoraUpdateCancellationReason,
}
import com.gu.zuora.{HolidayStopProcessor, HolidayStopProcessorZuoraConfig, Oauth}
import okhttp3.{MediaType, Protocol, Request, Response, ResponseBody}
import okio.Buffer
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import play.api.libs.json.{JsObject, JsString, JsValue, Json}
import sttp.client3.StringBody
import sttp.client3.testing.SttpBackendStub
import sttp.model.StatusCode

import java.time.LocalDate
import scala.collection.mutable
import scala.jdk.CollectionConverters._

class AutoCancelBehaviourTest extends AnyFlatSpec with Matchers {

  private val baseUrl = "https://rest.test.zuora.com"
  private val orderDate = LocalDate.of(2026, 10, 20)
  private val cancellationDate = LocalDate.of(2026, 9, 15)
  private val config = HolidayStopProcessorZuoraConfig(
    s"$baseUrl/v1",
    HolidayStopProcessor(Oauth("test-client", "test-secret")),
  )
  private val request = AutoCancelRequest("account-1", SubscriptionNumber("A-S001"), cancellationDate)
  private val success = Json.obj("success" -> true)

  private case class Exchange(
      method: String,
      path: String,
      response: JsValue = success,
      body: Option[JsValue] = None,
      status: Int = 200,
  )

  private class HttpScript(exchanges: List[Exchange]) {
    private val remaining = mutable.Queue.from(exchanges)

    private def next(method: String, url: String, body: Option[JsValue]): Exchange = {
      withClue(s"Unexpected request: $method $url") {
        remaining should not be empty
      }
      val expected = remaining.dequeue()
      (method, url) shouldBe (expected.method, baseUrl + expected.path)
      body shouldBe expected.body
      expected
    }

    val requests = new Requests(
      headers = Map.empty,
      baseUrl = s"$baseUrl/v1/",
      getResponse = (request: Request) => {
        val body = Option(request.body()).map { body =>
          val buffer = new Buffer()
          body.writeTo(buffer)
          Json.parse(buffer.readUtf8())
        }
        val expected = next(request.method(), request.url().toString, body)
        new Response.Builder()
          .request(request)
          .protocol(Protocol.HTTP_1_1)
          .code(expected.status)
          .message("scripted response")
          .body(ResponseBody.create(Json.stringify(expected.response), MediaType.parse("application/json")))
          .build()
      },
      jsonIsSuccessful = ZuoraRestRequestMaker.zuoraIsSuccessful,
    )

    val backend = SttpBackendStub.synchronous.whenRequestMatchesPartial { case httpRequest =>
      val body = httpRequest.body match {
        case StringBody(text, _, _) if httpRequest.uri.path == List("oauth", "token") => Some(JsString(text))
        case StringBody(text, _, _) => Some(Json.parse(text))
        case _ => None
      }
      val expected = next(httpRequest.method.method, httpRequest.uri.toString, body)
      sttp.client3.Response(Json.stringify(expected.response), StatusCode(expected.status))
    }

    private val invoiceTransactions = new ZuoraGetInvoiceTransactions(requests)
    val autoCancel = new AutoCancel(
      ZuoraOrderCancellationSteps.factory(requests, config, backend),
      invoiceTransactions,
      new TransferToCreditBalance(requests),
      new ApplyCreditBalance(requests),
      new ZuoraUpdateCancellationReason(requests),
    )

    def cancel(requestsToCancel: List[AutoCancelRequest] = List(request), remainingMillis: Int = 300000) =
      autoCancel
        .cancelAll(requestsToCancel, deadline(remainingMillis), orderDate)
        .toDisjunction

    def assertComplete() = remaining shouldBe empty

    val callout = AutoCancelInputFilterTest
      .fakeCallout(true)
      .copy(
        accountId = request.accountId,
        invoiceId = "unpaid-1",
      )
    var currentDate: LocalDate = orderDate

    def processor(emailResult: ClientFailableOp[Unit] = ClientSuccess(())): ProcessCalloutSteps =
      new ProcessCalloutSteps(
        autoCancel,
        new AutoCancelDataCollectionFilter(
          new ZuoraGetAccountSummary(requests),
          new ZuoraGetAccountSubscriptions(requests),
          new ZuoraGetSubsNamesOnInvoice(requests),
        ),
        new ZuoraEmailSteps(
          new EmailSender {
            override def send(message: EmailMessage): ClientFailableOp[Unit] = {
              assertComplete()
              message.To.Address shouldBe callout.email.get
              message.SfContactId shouldBe callout.sfContactId
              message.DataExtensionName shouldBe "cancelled-payment-email"
              val attributes = message.To.ContactAttributes.SubscriberAttributes
              attributes.subscriber_id shouldBe request.subToCancel.value
              attributes.product shouldBe "Supporter Plus"
              attributes.primaryKey shouldBe com.gu.util.email.InvoiceId(callout.invoiceId)
              sentEmails += message
              emailResult
            }
          },
          invoiceTransactions,
        ),
        new ProcessingClock {
          override def today: LocalDate = currentDate
        },
        TrustedApiConfig("test-token", "test-tenant"),
      )

    def process(
        autoPay: Boolean = true,
        token: String = "test-token",
        emailResult: ClientFailableOp[Unit] = ClientSuccess(()),
    ) =
      processor(emailResult)
        .execute(callout.copy(autoPay = autoPay.toString), token, deadline(300000))
        .toDisjunction

    val sentEmails: mutable.ListBuffer[EmailMessage] = mutable.ListBuffer.empty
  }

  private def deadline(remainingMillis: Int): Deadline = new Deadline {
    override def remainingTimeInMillis: Int = remainingMillis
  }

  private class InvocationContext(remainingMillis: Int) extends Context {
    var deadlineReads = 0

    override def getRemainingTimeInMillis: Int = {
      deadlineReads += 1
      remainingMillis
    }

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

  private class ReusingHandler(calloutProcessor: ProcessCalloutSteps, failFirstBuild: Boolean = false)
      extends AutoCancelSqsHandler {
    var builds = 0

    override protected def buildProcessor(): Either[ConfigFailure, ProcessCalloutSteps] = {
      builds += 1
      if (failFirstBuild && builds == 1) Left(ConfigFailure("Temporary configuration failure"))
      else Right(calloutProcessor)
    }
  }

  private def event(callout: AutoCancelCallout, count: Int = 1): SQSEvent = {
    val records = (1 to count).map { index =>
      val record = new SQSEvent.SQSMessage()
      record.setMessageId(s"message-$index")
      record.setBody(
        Json.stringify(
          Json.obj(
            "queryStringParameters" -> Json.obj("apiToken" -> "test-token"),
            "body" -> Json.stringify(Json.toJson(callout)(Json.writes[AutoCancelCallout])),
          ),
        ),
      )
      record
    }
    val sqsEvent = new SQSEvent()
    sqsEvent.setRecords(records.asJava)
    sqsEvent
  }

  private def item(subscription: String, charge: Double, tax: Double = 0): JsObject = Json.obj(
    "id" -> s"item-$subscription-$charge",
    "subscriptionName" -> subscription,
    "serviceStartDate" -> "2026-09-15",
    "serviceEndDate" -> "2026-10-14",
    "chargeAmount" -> charge,
    "taxAmount" -> tax,
    "chargeName" -> "Subscription",
    "productName" -> "Supporter Plus",
  )

  private def invoice(id: String, balance: Double, items: List[JsObject]): JsObject = Json.obj(
    "id" -> id,
    "invoiceDate" -> "2026-09-15",
    "amount" -> balance,
    "balance" -> balance,
    "status" -> "Posted",
    "invoiceItems" -> items,
  )

  private val balancingInvoice = invoice("balancing-1", -30, Nil)
  private val unpaidInvoice = invoice("unpaid-1", 20, List(item("A-S001", 20)))
  private val sharedInvoice = invoice(
    "unpaid-2",
    40,
    List(item("A-S001", 12, 1), item("A-S001", -3), item("A-S002", 30)),
  )
  private val transactions = Exchange(
    "GET",
    "/v1/transactions/invoices/accounts/account-1",
    success ++ Json.obj("invoices" -> List(balancingInvoice, unpaidInvoice, sharedInvoice)),
  )
  private val token = Exchange(
    "POST",
    "/oauth/token",
    Json.obj("access_token" -> "test-access-token"),
    Some(JsString("grant_type=client_credentials&client_id=test-client&client_secret=test-secret")),
  )

  private def updateReason(sub: String) = Exchange(
    "PUT",
    s"/v1/subscriptions/$sub",
    body = Some(Json.obj("CancellationReason__c" -> "System AutoCancel")),
  )

  private def submitOrder(sub: String) = Exchange(
    "POST",
    "/v1/async/orders",
    Json.obj("success" -> true, "jobId" -> "job-1"),
    Some(
      Json.obj(
        "orderDate" -> orderDate.toString,
        "existingAccountId" -> request.accountId,
        "subscriptions" -> Json.arr(
          Json.obj(
            "subscriptionNumber" -> sub,
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
      ),
    ),
  )

  private val completedOrder = Exchange(
    "GET",
    "/v1/async-jobs/job-1",
    Json.obj(
      "status" -> "Completed",
      "result" -> Json.obj("status" -> "Completed", "invoiceNumbers" -> List("INV-001")),
    ),
  )
  private val invoiceLookup = Exchange("GET", "/v1/invoices/INV-001", success ++ Json.obj("id" -> "balancing-1"))

  private def adjustment(id: String, amount: Double, adjustmentType: String) = Exchange(
    "POST",
    "/v1/object/credit-balance-adjustment",
    body = Some(
      Json.obj(
        "SourceTransactionId" -> id,
        "Amount" -> amount,
        "Type" -> adjustmentType,
        "Comment" -> "Auto-cancellation",
      ),
    ),
  )

  private def cancellation(sub: String = "A-S001"): List[Exchange] =
    if (sub == "A-S001")
      List(
        updateReason(sub),
        submitOrder(sub),
        completedOrder,
        invoiceLookup,
        transactions,
        adjustment("balancing-1", 30, "Increase"),
        adjustment("unpaid-1", 20, "Decrease"),
        adjustment("unpaid-2", 10, "Decrease"),
      )
    else
      List(
        updateReason(sub),
        submitOrder(sub).copy(response = Json.obj("success" -> true, "jobId" -> "job-2")),
        completedOrder.copy(
          path = "/v1/async-jobs/job-2",
          response = Json.obj(
            "status" -> "Completed",
            "result" -> Json.obj("status" -> "Completed", "invoiceNumbers" -> List("INV-002")),
          ),
        ),
        invoiceLookup.copy(path = "/v1/invoices/INV-002", response = success ++ Json.obj("id" -> "balancing-2")),
        transactions.copy(
          response = success ++ Json.obj(
            "invoices" -> List(
              invoice("balancing-2", -30, Nil),
              unpaidInvoice ++ Json.obj("balance" -> 0),
              sharedInvoice ++ Json.obj("balance" -> 30),
            ),
          ),
        ),
        adjustment("balancing-2", 30, "Increase"),
        adjustment("unpaid-2", 30, "Decrease"),
      )

  "AutoCancel through HTTP" should "cancel and balance invoices in order with the correct dates, tax and discounts" in {
    val script = new HttpScript(token :: cancellation())

    script.cancel() shouldBe Right(())
    script.assertComplete()
  }

  private val failureStages = List(
    "cancellation reason" -> 0,
    "order submission" -> 1,
    "order completion" -> 2,
    "invoice lookup" -> 3,
    "invoice transactions" -> 4,
    "credit transfer" -> 5,
    "first credit application" -> 6,
    "last credit application" -> 7,
  )

  private def failingCancellation(index: Int): List[Exchange] = {
    val steps = cancellation()
    val failed =
      if (index == 2)
        steps(index).copy(response = Json.obj("status" -> "Failed", "errors" -> "Cancellation rejected"))
      else steps(index).copy(status = 500, response = Json.obj("error" -> "Request rejected"))
    val laterCreditApplications = if (index == 6) steps.drop(7) else Nil
    steps.take(index) ++ List(failed) ++ laterCreditApplications
  }

  failureStages.foreach { case (stage, index) =>
    it should s"propagate a failure at $stage without running dependent steps" in {
      val script = new HttpScript(token :: failingCancellation(index))

      script.cancel() shouldBe Left(internalServerError("AutoCancel failed"))
      script.assertComplete()
    }
  }

  it should "stop before any subscription work if authentication with Zuora fails" in {
    val script = new HttpScript(List(token.copy(status = 401)))

    script.cancel() shouldBe Left(internalServerError("AutoCancel failed"))
    script.assertComplete()
  }

  it should "not submit an order when insufficient Lambda time remains" in {
    val script = new HttpScript(List(token, updateReason("A-S001")))

    script.cancel(remainingMillis = 129999) shouldBe Left(internalServerError("AutoCancel failed"))
    script.assertComplete()
  }

  it should "still process the next subscription after an earlier cancellation fails" in {
    val script = new HttpScript(token :: (failingCancellation(1) ++ cancellation("A-S002")))
    val second = request.copy(subToCancel = SubscriptionNumber("A-S002"))

    script.cancel(List(request, second)) shouldBe Left(internalServerError("AutoCancel failed"))
    script.assertComplete()
  }

  it should "successfully process every subscription" in {
    val script = new HttpScript(token :: (cancellation() ++ cancellation("A-S002")))

    script.cancel(List(request, request.copy(subToCancel = SubscriptionNumber("A-S002")))) shouldBe Right(())
    script.assertComplete()
  }

  it should "read the current deadline again before each subscription's order" in {
    val script = new HttpScript(token :: (cancellation() :+ updateReason("A-S002")))
    val remainingTimes = Iterator(300000, 129999)
    val liveDeadline = new Deadline {
      override def remainingTimeInMillis: Int = remainingTimes.next()
    }

    script.autoCancel
      .cancelAll(List(request, request.copy(subToCancel = SubscriptionNumber("A-S002"))), liveDeadline, orderDate)
      .toDisjunction shouldBe Left(internalServerError("AutoCancel failed"))
    remainingTimes.hasNext shouldBe false
    script.assertComplete()
  }

  List(
    "the balancing invoice is missing" -> List(unpaidInvoice),
    "there are no unpaid invoices" -> List(balancingInvoice, invoice("settled", 0, Nil)),
  ).foreach { case (description, invoices) =>
    it should s"fail without transferring credit when $description" in {
      val summary = transactions.copy(response = success ++ Json.obj("invoices" -> invoices))
      val script = new HttpScript(token :: (cancellation().take(4) :+ summary))

      script.cancel() shouldBe Left(internalServerError("AutoCancel failed"))
      script.assertComplete()
    }
  }

  List(
    "no invoice numbers" -> Json.obj("status" -> "Completed"),
    "an empty invoice list" -> Json.obj("status" -> "Completed", "invoiceNumbers" -> List.empty[String]),
    "multiple invoices" -> Json.obj("status" -> "Completed", "invoiceNumbers" -> List("INV-001", "INV-002")),
  ).foreach { case (description, result) =>
    it should s"not look up or balance invoices when an order returns $description" in {
      val report = completedOrder.copy(response = Json.obj("status" -> "Completed", "result" -> result))
      val script = new HttpScript(List(token, updateReason("A-S001"), submitOrder("A-S001"), report))

      script.cancel() shouldBe Left(internalServerError("AutoCancel failed"))
      script.assertComplete()
    }
  }

  List(
    "no items" -> Nil,
    "no matching subscription items" -> List(item("other-1", 10), item("other-2", 10)),
  ).foreach { case (description, items) =>
    it should s"attempt later invoices even when an unpaid invoice has $description" in {
      val summary = transactions.copy(
        response =
          success ++ Json.obj("invoices" -> List(balancingInvoice, invoice("unpaid-1", 20, items), sharedInvoice)),
      )
      val steps = cancellation()
      val script = new HttpScript(token :: (steps.take(4) ++ List(summary, steps(5), steps(7))))

      script.cancel() shouldBe Left(internalServerError("AutoCancel failed"))
      script.assertComplete()
    }
  }

  private val collection = List(
    Exchange(
      "GET",
      "/v1/accounts/account-1/summary",
      success ++ Json.obj(
        "basicInfo" -> Json.obj(
          "id" -> "account-1",
          "balance" -> 50,
          "defaultPaymentMethod" -> Json.obj("id" -> "payment-method"),
        ),
        "subscriptions" -> Json.arr(
          Json.obj("id" -> "subscription-1", "subscriptionNumber" -> "A-S001", "status" -> "Active"),
        ),
        "invoices" -> Json.arr(
          Json.obj("id" -> "unpaid-1", "dueDate" -> "2026-10-01", "balance" -> 20, "status" -> "Posted"),
          Json.obj("id" -> "unpaid-2", "dueDate" -> cancellationDate.toString, "balance" -> 40, "status" -> "Posted"),
        ),
      ),
    ),
    Exchange(
      "GET",
      "/v1/invoices/unpaid-1/items",
      success ++ Json.obj("invoiceItems" -> List(item("A-S001", 20))),
    ),
    Exchange(
      "GET",
      "/v1/subscriptions/accounts/account-1?pageSize=40",
      success ++ Json.obj("subscriptions" -> Json.arr(Json.obj("subscriptionNumber" -> "A-S001", "status" -> "Active"))),
    ),
  )

  "ProcessCalloutSteps through HTTP" should "send the cancellation email only after all credit work succeeds" in {
    val script = new HttpScript(collection ++ List(token) ++ cancellation() ++ List(transactions))

    script.process() shouldBe Right(())
    script.sentEmails should have size 1
    script.assertComplete()
  }

  failureStages.foreach { case (stage, index) =>
    it should s"not send an email when $stage fails" in {
      val script = new HttpScript(collection ++ List(token) ++ failingCancellation(index))

      script.process() shouldBe Left(internalServerError("AutoCancel failed"))
      script.sentEmails shouldBe empty
      script.assertComplete()
    }
  }

  it should "propagate an email sending failure after completing the cancellation" in {
    val script = new HttpScript(collection ++ List(token) ++ cancellation() ++ List(transactions))

    script.process(emailResult = GenericError("Email queue unavailable")) shouldBe Left(
      internalServerError("send email"),
    )
    script.sentEmails should have size 1
    script.assertComplete()
  }

  it should "not send an email when fetching the email's invoice data fails" in {
    val script = new HttpScript(collection ++ List(token) ++ cancellation() ++ List(transactions.copy(status = 500)))

    script.process() shouldBe Left(internalServerError("send email"))
    script.sentEmails shouldBe empty
    script.assertComplete()
  }

  it should "reject an invalid token before making any external calls" in {
    val script = new HttpScript(Nil)

    script.process(token = "invalid") shouldBe Left(unauthorized)
    script.sentEmails shouldBe empty
    script.assertComplete()
  }

  it should "skip accounts with AutoPay disabled before making any external calls" in {
    val script = new HttpScript(Nil)

    script.process(autoPay = false) shouldBe Left(noActionRequired("AutoPay is false"))
    script.sentEmails shouldBe empty
    script.assertComplete()
  }

  "AutoCancelSqsHandler" should "reuse its processor across records and invocations without retaining deadlines or dates" in {
    val failedAttempt = collection ++ List(token, updateReason("A-S001"))
    val nextDate = orderDate.plusDays(1)
    val nextCancellation = cancellation().map { exchange =>
      if (exchange.path == "/v1/async/orders")
        exchange.copy(body = exchange.body.map(_.as[JsObject] ++ Json.obj("orderDate" -> nextDate.toString)))
      else exchange
    }
    val script = new HttpScript(
      failedAttempt ++ failedAttempt ++ collection ++ List(token) ++ nextCancellation ++ List(transactions),
    )
    val handler = new ReusingHandler(script.processor())
    val firstContext = new InvocationContext(129999)
    val nextContext = new InvocationContext(300000)

    val error = intercept[RuntimeException] {
      handler.handleRequest(event(script.callout, count = 2), firstContext)
    }
    error.getMessage should include("Failed to process 2 message(s)")
    script.sentEmails shouldBe empty

    script.currentDate = nextDate
    handler.handleRequest(event(script.callout), nextContext)

    handler.builds shouldBe 1
    firstContext.deadlineReads shouldBe 2
    nextContext.deadlineReads shouldBe 1
    script.sentEmails should have size 1
    script.assertComplete()
  }

  it should "retry a failed processor initialization rather than caching the configuration failure" in {
    val script = new HttpScript(Nil)
    val handler = new ReusingHandler(script.processor(), failFirstBuild = true)
    val context = new InvocationContext(300000)
    val callout = script.callout.copy(autoPay = "false")

    val error = intercept[RuntimeException] {
      handler.handleRequest(event(callout, count = 2), context)
    }
    error.getMessage should include("Failed to process 1 message(s)")
    handler.builds shouldBe 2

    handler.handleRequest(event(callout), context)

    handler.builds shouldBe 2
    context.deadlineReads shouldBe 0
    script.sentEmails shouldBe empty
    script.assertComplete()
  }
}

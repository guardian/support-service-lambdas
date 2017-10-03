package com.gu.paymentFailure

import java.io.ByteArrayOutputStream
import org.joda.time.LocalDate
import org.scalatest.FlatSpec
import org.scalatest._
import Matchers._
import com.amazonaws.services.sqs.model.SendMessageResult
import com.gu.util.ZuoraModels._
import com.gu.util._
import org.scalatest.mockito.MockitoSugar
import play.api.libs.json.Json
import scalaz.\/-
import org.mockito.Mockito._
import org.mockito.Matchers.any
import scala.util.{ Failure, Success, Try }

class PaymentFailureHandlerTest extends FlatSpec with MockitoSugar {

  val fakeZuoraRest = mock[ZuoraService]
  val fakeQueueClient = mock[QueueClient]

  val today = new LocalDate(2016, 11, 21)
  val accountId = "accountId"
  val invoiceItemA = InvoiceItem("invitem123", "A-S123", today, today.plusMonths(1), 49.21, "Non founder - annual", "Supporter")
  val invoiceItemB = InvoiceItem("invitem122", "A-S123", today, today.plusMonths(1), 0, "Friends", "Friend")
  val invoiceItemC = InvoiceItem("invitem121", "A-S123", today, today.plusMonths(1), -4.90, "Percentage", "Discount")
  def itemisedInvoice(balance: Double, invoiceItems: List[InvoiceItem]) = ItemisedInvoice("invoice123", today, 49, balance, "Posted", List(invoiceItemA))
  val basicInvoiceTransactionSummary = InvoiceTransactionSummary(List(itemisedInvoice(49, List(invoiceItemA))))
  val weirdInvoiceTransactionSummary = InvoiceTransactionSummary(List(itemisedInvoice(0, List(invoiceItemA)), itemisedInvoice(49, List(invoiceItemB, invoiceItemA, invoiceItemC))))

  val fakeApiConfig = TrustedApiConfig("validApiClientId", "validApiToken", "testEnvTenantId")
  val fakeZuoraConfig = ZuoraRestConfig("fakeUrl", "fakeUser", "fakePass")

  val lambda = new PaymentFailureLambda {
    override def stage: String = "DEV"
    override def configAttempt: Try[Config] = Success(Config(fakeApiConfig, fakeZuoraConfig))
    override def queueClient: QueueClient = fakeQueueClient
    override def getZuoraRestService: Try[ZuoraService] = Success(fakeZuoraRest)
  }

  val missingCredentialsResponse = """{"statusCode":"401","headers":{"Content-Type":"application/json"},"body":"Credentials are missing or invalid"}"""
  val successfulResponse = """{"statusCode":"200","headers":{"Content-Type":"application/json"},"body":"Success"}"""

  "dataCollection" should "identify the correct product information" in {
    implicit val zuoraRest = fakeZuoraRest
    when(fakeZuoraRest.getInvoiceTransactions("accountId")).thenReturn(\/-(weirdInvoiceTransactionSummary))
    assert(lambda.dataCollection(accountId).get.product == "Supporter")
  }

  "lambda" should "return error if credentials are missing" in {
    val stream = getClass.getResourceAsStream("/paymentFailure/missingCredentials.json")
    val os = new ByteArrayOutputStream()
    lambda.handleRequest(stream, os, null)
    val responseString = new String(os.toByteArray(), "UTF-8");
    responseString jsonMatches missingCredentialsResponse
  }

  "lambda" should "return error if credentials don't match" in {
    val stream = getClass.getResourceAsStream("/paymentFailure/invalidCredentials.json")
    val os = new ByteArrayOutputStream()
    lambda.handleRequest(stream, os, null)
    val responseString = new String(os.toByteArray(), "UTF-8");
    responseString jsonMatches missingCredentialsResponse
  }

  "lambda" should "return an error if tenant id doesn't match" in {
    val stream = getClass.getResourceAsStream("/paymentFailure/invalidTenant.json")
    val os = new ByteArrayOutputStream()
    lambda.handleRequest(stream, os, null)
    val responseString = new String(os.toByteArray(), "UTF-8");
    responseString jsonMatches missingCredentialsResponse
  }

  "lambda" should "enqueue email and return success for a valid request" in {
    //set up
    val stream = getClass.getResourceAsStream("/paymentFailure/validRequest.json")
    val output = new ByteArrayOutputStream

    val os = new ByteArrayOutputStream()
    when(fakeZuoraRest.getInvoiceTransactions("accountId")).thenReturn(\/-(basicInvoiceTransactionSummary))
    when(fakeQueueClient.sendDataExtensionToQueue(any[Message])).thenReturn(Success(mock[SendMessageResult]))
    //execute
    lambda.handleRequest(stream, os, null)

    //verify
    val responseString = new String(os.toByteArray(), "UTF-8")

    val expectedMessage = Message(
      DataExtensionName = "first-failed-payment-email",
      To = ToDef(
        Address = "test.user123@guardian.co.uk",
        SubscriberKey = "test.user123@guardian.co.uk",
        ContactAttributes = ContactAttributesDef(
          SubscriberAttributes = SubscriberAttributesDef(
            SubscriberKey = "test.user123@guardian.co.uk",
            EmailAddress = "test.user123@guardian.co.uk",
            subscriber_id = "A-S123",
            product = "Supporter",
            payment_method = "CreditCard",
            card_type = "Visa",
            card_expiry_date = "12/2017",
            first_name = "Test",
            last_name = "User",
            paymentId = "somePaymentId",
            price = "£49.00",
            serviceStartDate = "21 November 2016",
            serviceEndDate = "21 December 2016"
          )
        )
      )
    )

    verify(fakeQueueClient).sendDataExtensionToQueue(expectedMessage)
    responseString jsonMatches successfulResponse
  }

  "lambda" should "return error if no additional data is found in zuora" in {
    //set up
    val stream = getClass.getResourceAsStream("/paymentFailure/validRequest.json")
    val output = new ByteArrayOutputStream
    val invoiceTransactionSummary = InvoiceTransactionSummary(List())

    when(fakeZuoraRest.getInvoiceTransactions(accountId)).thenReturn(\/-(invoiceTransactionSummary))

    when(fakeQueueClient.sendDataExtensionToQueue(any[Message])).thenReturn(Success(mock[SendMessageResult]))

    val os = new ByteArrayOutputStream()

    //execute
    lambda.handleRequest(stream, os, null)

    //verify
    val responseString = new String(os.toByteArray(), "UTF-8")

    val expectedResponse = s"""{"statusCode":"500","headers":{"Content-Type":"application/json"},"body":"Failed to process event due to the following error: Could not retrieve additional data for account $accountId"} """
    responseString jsonMatches expectedResponse
  }

  "lambda" should "return error if message can't be queued" in {
    //set up
    val stream = getClass.getResourceAsStream("/paymentFailure/validRequest.json")
    val output = new ByteArrayOutputStream
    when(fakeZuoraRest.getInvoiceTransactions("accountId")).thenReturn(\/-(basicInvoiceTransactionSummary))

    when(fakeQueueClient.sendDataExtensionToQueue(any[Message])).thenReturn(Success(mock[SendMessageResult]))
    when(fakeQueueClient.sendDataExtensionToQueue(any[Message])).thenReturn(Failure(new Exception("something failed!")))

    val os = new ByteArrayOutputStream()

    //execute
    lambda.handleRequest(stream, os, null)

    //verify
    val responseString = new String(os.toByteArray(), "UTF-8")

    val expectedResponse = s"""{"statusCode":"500","headers":{"Content-Type":"application/json"},"body":"Failed to process event due to the following error: Could not enqueue message for account $accountId"} """
    responseString jsonMatches expectedResponse
  }

  implicit class JsonMatcher(private val actual: String) {
    def jsonMatches(expected: String) = {
      val expectedJson = Json.parse(expected)
      val actualJson = Json.parse(actual)
      expectedJson should be(actualJson)
    }
  }

}

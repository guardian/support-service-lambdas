package com.gu.paymentFailure

import java.io.ByteArrayOutputStream

import com.gu.autoCancel.ZuoraModels._
import com.gu.paymentFailure.Lambda._
import org.joda.time.{ DateTime, LocalDate }
import org.scalatest.FlatSpec
import org.scalatest._
import Matchers._
import com.amazonaws.services.sqs.model.SendMessageResult
import com.gu.autoCancel.ZuoraService
import org.scalatest.mockito.MockitoSugar
import play.api.libs.json.Json

import scalaz.\/-
import org.mockito.Mockito._
import org.mockito.Matchers.any

import scala.util.{ Failure, Success }

class LambdaTest extends FlatSpec with MockitoSugar {

  val fakeZuoraService = mock[ZuoraService]
  val fakeQueueClient = mock[QueueClient]
  val today = LocalDate.now()
  val accountId = "accountId"
  val invoiceItemA = InvoiceItem("invitem123", "A-S123", today, today.plusMonths(1), 49, "Non founder - annual", "Supporter")
  val invoiceItemB = InvoiceItem("invitem122", "A-S123", today, today.plusMonths(1), 0, "Friends", "Friend")
  val invoiceItemC = InvoiceItem("invitem121", "A-S123", today, today.plusMonths(1), -4.90, "Percentage", "Discount")
  def itemisedInvoice(balance: Double, invoiceItems: List[InvoiceItem]) = ItemisedInvoice("invoice123", today, 49, balance, "Posted", List(invoiceItemA))
  val basicInvoiceTransactionSummary = InvoiceTransactionSummary(List(itemisedInvoice(49, List(invoiceItemA))))
  val weirdInvoiceTransactionSummary = InvoiceTransactionSummary(List(itemisedInvoice(0, List(invoiceItemA)), itemisedInvoice(49, List(invoiceItemB, invoiceItemA, invoiceItemC))))

  val lambda = new PaymentFailureLambda {

    override def config: Config = new Config {
      override val apiToken = "validApiToken"
      override val apiClientId = "validApiClientId"
    }
    override def zuoraService = fakeZuoraService
    override def queueClient: QueueClient = fakeQueueClient
    override def currentDate = new DateTime(2005, 6, 23, 12, 0, 0, 0)

  }

  val missingCredentialsResponse = """{"statusCode":"401","headers":{"Content-Type":"application/json"},"body":"Credentials are missing or invalid"}"""
  val successfulResponse = """{"statusCode":"200","headers":{"Content-Type":"application/json"},"body":"Success"}"""

  "dataCollection" should "identify the correct product information" in {
    when(fakeZuoraService.getInvoiceTransactions("accountId")).thenReturn(\/-(weirdInvoiceTransactionSummary))
    assert(lambda.dataCollection(accountId).get.product == "Supporter")
  }

  "lambda" should "return error if credentials are missing" in {
    val stream = getClass.getResourceAsStream("/paymentFailure/missingCredentials.json")
    val output = new ByteArrayOutputStream

    val os = new ByteArrayOutputStream()
    lambda.handleRequest(stream, os, null)
    val responseString = new String(os.toByteArray(), "UTF-8");
    responseString jsonMatches missingCredentialsResponse
  }

  "lambda" should "return error if credentials don't match" in {
    val stream = getClass.getResourceAsStream("/paymentFailure/invalidCredentials.json")
    val output = new ByteArrayOutputStream

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
    when(fakeZuoraService.getInvoiceTransactions("accountId")).thenReturn(\/-(basicInvoiceTransactionSummary))
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
            DateField = "06/23/2005",
            subscriber_id = "A-S123",
            product = "Supporter",
            payment_method = "CreditCard",
            card_type = "Visa",
            card_expiry_date = "12/2017",
            first_name = "Test",
            last_name = "User"
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

    when(fakeZuoraService.getInvoiceTransactions(accountId)).thenReturn(\/-(invoiceTransactionSummary))

    when(fakeQueueClient.sendDataExtensionToQueue(any[Message])).thenReturn(Success(mock[SendMessageResult]))

    val os = new ByteArrayOutputStream()

    //execute
    lambda.handleRequest(stream, os, null)

    //verify
    val responseString = new String(os.toByteArray(), "UTF-8")

    val expectedResponse = s"""{"statusCode":"500","headers":{"Content-Type":"application/json"},"body":"Failed to process auto-cancellation with the following error: Could not retrieve additional data for account $accountId"} """
    responseString jsonMatches expectedResponse
  }

  "lambda" should "return error if message can't be queued" in {
    //set up
    val stream = getClass.getResourceAsStream("/paymentFailure/validRequest.json")
    val output = new ByteArrayOutputStream
    when(fakeZuoraService.getInvoiceTransactions("accountId")).thenReturn(\/-(basicInvoiceTransactionSummary))

    when(fakeQueueClient.sendDataExtensionToQueue(any[Message])).thenReturn(Success(mock[SendMessageResult]))
    when(fakeQueueClient.sendDataExtensionToQueue(any[Message])).thenReturn(Failure(new Exception("something failed!")))

    val os = new ByteArrayOutputStream()

    //execute
    lambda.handleRequest(stream, os, null)

    //verify
    val responseString = new String(os.toByteArray(), "UTF-8")

    val expectedResponse = s"""{"statusCode":"500","headers":{"Content-Type":"application/json"},"body":"Failed to process auto-cancellation with the following error: Could not enqueue message for account $accountId"} """
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

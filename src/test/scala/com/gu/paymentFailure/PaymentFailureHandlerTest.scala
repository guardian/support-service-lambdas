package com.gu.paymentFailure

import java.io.ByteArrayOutputStream

import com.gu.autoCancel.{ TestingRawEffects, WithDependenciesFailableOp }
import com.gu.paymentFailure.PaymentFailureSteps.PFDeps
import com.gu.util.ETConfig.{ ETSendId, ETSendIds }
import com.gu.util._
import com.gu.util.apigateway.ApiGatewayHandler.HandlerDeps
import com.gu.util.apigateway.ApiGatewayResponse.unauthorized
import com.gu.util.apigateway.{ ApiGatewayHandler, ApiGatewayResponse }
import com.gu.util.exacttarget.EmailSend.ETS
import com.gu.util.exacttarget._
import com.gu.util.reader.Types._
import com.gu.util.zuora.ZuoraModels._
import org.joda.time.LocalDate
import org.scalatest.FlatSpec
import org.scalatest.Matchers._
import play.api.libs.json.Json

import scala.util.Success
import scalaz.{ -\/, \/ }

class PaymentFailureHandlerTest extends FlatSpec {

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
  val fakeETConfig = ETConfig(etSendIDs = ETSendIds(ETSendId("11"), ETSendId("22"), ETSendId("33"), ETSendId("44"), ETSendId("can")), "fakeClientId", "fakeClientSecret")

  val missingCredentialsResponse = """{"statusCode":"401","headers":{"Content-Type":"application/json"},"body":"Credentials are missing or invalid"}"""
  val successfulResponse = """{"statusCode":"200","headers":{"Content-Type":"application/json"},"body":"Success"}"""

  "getPaymentData" should "identify the correct product information" in {
    val actual = GetPaymentData(accountId)(weirdInvoiceTransactionSummary).map(_.product)
    assert(actual == \/.right("Supporter"))
  }

  "validate tenant" should "fail if it's wrong" in {

    val actualWrongTenantId = "wrong"

    val expected = \/.left(unauthorized)
    val result = PaymentFailureSteps.validateTenantCallout(actualWrongTenantId).run(fakeApiConfig)

    result should be(expected)
  }

  "lambda" should "return error if credentials are missing" in {
    val stream = getClass.getResourceAsStream("/paymentFailure/missingCredentials.json")
    val os = new ByteArrayOutputStream()
    ApiGatewayHandler(lambdaConfig, HandlerDeps(_ => Success(fakeConfig)))(basicOp())(stream, os, null)
    val responseString = new String(os.toByteArray(), "UTF-8");
    responseString jsonMatches missingCredentialsResponse
  }

  "lambda" should "return error if credentials don't match" in {
    val stream = getClass.getResourceAsStream("/paymentFailure/invalidCredentials.json")
    val os = new ByteArrayOutputStream()
    ApiGatewayHandler(lambdaConfig, HandlerDeps(_ => Success(fakeConfig)))(basicOp())(stream, os, null)
    val responseString = new String(os.toByteArray(), "UTF-8");
    responseString jsonMatches missingCredentialsResponse
  }

  "lambda" should "return an error if tenant id doesn't match" in {
    val stream = getClass.getResourceAsStream("/paymentFailure/invalidTenant.json")
    val os = new ByteArrayOutputStream()
    ApiGatewayHandler(lambdaConfig, HandlerDeps(_ => Success(fakeConfig)))(basicOp())(stream, os, null)
    val responseString = new String(os.toByteArray(), "UTF-8");
    responseString jsonMatches missingCredentialsResponse
  }

  "lambda" should "enqueue email and return success for a valid request" in {
    //set up
    val stream = getClass.getResourceAsStream("/paymentFailure/validRequest.json")
    val output = new ByteArrayOutputStream
    var storedReq: Option[EmailRequest] = None

    val os = new ByteArrayOutputStream()
    //execute
    ApiGatewayHandler(lambdaConfig, HandlerDeps(_ => Success(fakeConfig)))({
      PaymentFailureSteps.apply(PFDeps(req => {
        storedReq = Some(req)
        WithDependenciesFailableOp.liftT(())
      }, _ => WithDependenciesFailableOp.liftT(basicInvoiceTransactionSummary)))
    })(stream, os, null)

    //verify
    val responseString = new String(os.toByteArray, "UTF-8")

    val expectedMessage = EmailRequest(
      etSendId = ETSendId("11"),
      Message(
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
    )

    storedReq should be(Some(expectedMessage))
    responseString jsonMatches successfulResponse
  }

  "lambda" should "return error if no additional data is found in zuora" in {
    //set up
    val stream = getClass.getResourceAsStream("/paymentFailure/validRequest.json")
    val output = new ByteArrayOutputStream
    val invoiceTransactionSummary = InvoiceTransactionSummary(List())

    val os = new ByteArrayOutputStream()

    //execute
    ApiGatewayHandler(lambdaConfig, HandlerDeps(_ => Success(fakeConfig))) {
      basicOp(invoiceTransactionSummary)
    }(stream, os, null)

    //verify
    val responseString = new String(os.toByteArray(), "UTF-8")

    val expectedResponse = s"""{"statusCode":"500","headers":{"Content-Type":"application/json"},"body":"Failed to process event due to the following error: Could not retrieve additional data for account $accountId"} """
    responseString jsonMatches expectedResponse
  }

  //  val lambdaConfig: FailableOp[ConfigHttp] = \/-(new TestingStateHttp(false, Some(fakeApiConfig)).stateHttp)
  val fakeConfig = Config("DEV", fakeApiConfig, zuoraRestConfig = ZuoraRestConfig("https://ddd", "e@f.com", "ggg"),
    etConfig = ETConfig(etSendIDs = ETSendIds(ETSendId("11"), ETSendId("22"), ETSendId("33"), ETSendId("44"), ETSendId("can")), clientId = "jjj", clientSecret = "kkk"))

  val lambdaConfig = new TestingRawEffects(false, 1).rawEffects
  def basicOp(fakeInvoiceTransactionSummary: InvoiceTransactionSummary = basicInvoiceTransactionSummary) = PaymentFailureSteps.apply(PFDeps(req =>
    (-\/(ApiGatewayResponse.internalServerError("something failed!")): FailableOp[Unit]).toReader[ETS], _ => WithDependenciesFailableOp.liftT(fakeInvoiceTransactionSummary)))_

  "lambda" should "return error if message can't be queued" in {
    //set up
    val stream = getClass.getResourceAsStream("/paymentFailure/validRequest.json")
    val output = new ByteArrayOutputStream

    var storedReq: Option[EmailRequest] = None
    val os = new ByteArrayOutputStream()

    //execute
    ApiGatewayHandler(lambdaConfig, HandlerDeps(_ => Success(fakeConfig))) {
      PaymentFailureSteps.apply(PFDeps(req => {
        storedReq = Some(req)
        (-\/(ApiGatewayResponse.internalServerError("something failed!")): FailableOp[Unit]).toReader[ETS]
      }, _ => WithDependenciesFailableOp.liftT(basicInvoiceTransactionSummary)))
    }(stream, os, null)

    //verify

    storedReq.isDefined should be(true)

    val responseString = new String(os.toByteArray(), "UTF-8")

    val expectedResponse = s"""{"statusCode":"500","headers":{"Content-Type":"application/json"},"body":"email not sent for account $accountId"} """
    responseString jsonMatches expectedResponse
  }

  implicit class JsonMatcher(private val actual: String) {
    def jsonMatches(expected: String) = {
      val expectedJson = Json.parse(expected)
      val actualJson = Json.parse(actual)
      actualJson should be(expectedJson)
    }
  }

}

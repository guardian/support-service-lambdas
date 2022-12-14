package com.gu.paymentFailure

import java.io.ByteArrayOutputStream

import com.gu.TestData
import com.gu.TestData._
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.email._
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import com.gu.util.resthttp.Types.{ClientSuccess, GenericError}
import com.gu.util.zuora.ZuoraGetInvoiceTransactions.InvoiceTransactionSummary
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class PaymentFailureHandlerTest extends AnyFlatSpec with Matchers {

  "lambda" should "return error if credentials are missing" in {
    val stream = getClass.getResourceAsStream("/paymentFailure/missingCredentials.json")
    val os = new ByteArrayOutputStream()
    val op = Lambda.operationForEffects(Right(TestData.fakeApiConfig), ContinueProcessing(basicOp()))
    ApiGatewayHandler(LambdaIO(stream, os, null))(op)
    val responseString = new String(os.toByteArray(), "UTF-8")
    responseString jsonMatches missingCredentialsResponse
  }

  it should "return error if credentials don't match" in {
    val stream = getClass.getResourceAsStream("/paymentFailure/invalidCredentials.json")
    val os = new ByteArrayOutputStream()
    val op = Lambda.operationForEffects(Right(TestData.fakeApiConfig), ContinueProcessing(basicOp()))
    ApiGatewayHandler(LambdaIO(stream, os, null))(op)
    val responseString = new String(os.toByteArray(), "UTF-8")
    responseString jsonMatches missingCredentialsResponse
  }

  it should "return an error if tenant id doesn't match" in {
    val stream = getClass.getResourceAsStream("/paymentFailure/invalidTenant.json")
    val os = new ByteArrayOutputStream()
    apiGatewayHandler(basicOp(), LambdaIO(stream, os, null))
    val responseString = new String(os.toByteArray(), "UTF-8")
    responseString jsonMatches missingCredentialsResponse
  }

  it should "enqueue email and return success for a valid request" in {
    // set up
    val stream = getClass.getResourceAsStream("/paymentFailure/validRequest.json")
    var storedReq: Option[EmailMessage] = None

    val os = new ByteArrayOutputStream()
    // execute
    def configToFunction: Operation = {
      PaymentFailureSteps.apply(
        ZuoraEmailSteps.sendEmailRegardingAccount(
          { message =>
            storedReq = Some(message)
            ClientSuccess(())
          },
          a => ClientSuccess(basicInvoiceTransactionSummary),
        ),
        TestData.fakeApiConfig,
      )
    }
    apiGatewayHandler(configToFunction, LambdaIO(stream, os, null))

    // verify
    val responseString = new String(os.toByteArray, "UTF-8")

    val expectedMessage = EmailMessage(
      To = ToDef(
        Address = "test.user123@guardian.co.uk",
        SubscriberKey = "test.user123@guardian.co.uk",
        ContactAttributes = ContactAttributesDef(
          SubscriberAttributes = SubscriberAttributesDef(
            subscriber_id = "A-S123",
            product = "Supporter",
            payment_method = "CreditCard",
            card_type = "Visa",
            card_expiry_date = "12/2017",
            first_name = "Test",
            last_name = "User",
            primaryKey = PaymentId("somePaymentId"),
            serviceStartDate = "21 November 2016",
            serviceEndDate = "21 December 2016",
          ),
        ),
      ),
      DataExtensionName = "first-failed-payment-email",
      SfContactId = "1000000",
    )

    storedReq should be(Some(expectedMessage))
    responseString jsonMatches successfulResponse
  }

  it should "return 200 response with warning message if no email is provided" in {
    // set up
    val stream = getClass.getResourceAsStream("/paymentFailure/missingEmail.json")
    var storedReq: Option[EmailMessage] = None

    val os = new ByteArrayOutputStream()
    // execute
    def configToFunction: Operation = {
      PaymentFailureSteps.apply(
        ZuoraEmailSteps.sendEmailRegardingAccount(
          { message =>
            storedReq = Some(message)
            ClientSuccess(())
          },
          a => ClientSuccess(basicInvoiceTransactionSummary),
        ),
        TestData.fakeApiConfig,
      )
    }
    apiGatewayHandler(configToFunction, LambdaIO(stream, os, null))

    // verify
    val responseString = new String(os.toByteArray, "UTF-8")
    responseString jsonMatches missingEmailResponse
  }

  it should "return error if no additional data is found in zuora" in {
    // set up
    val stream = getClass.getResourceAsStream("/paymentFailure/validRequest.json")
    val invoiceTransactionSummary = InvoiceTransactionSummary(List())

    val os = new ByteArrayOutputStream()

    // execute
    apiGatewayHandler(basicOp(invoiceTransactionSummary), LambdaIO(stream, os, null))

    // verify
    val responseString = new String(os.toByteArray(), "UTF-8")

    responseString jsonMatches couldNotFindDataForAccountResponse
  }

  def apiGatewayHandler: (Operation, LambdaIO) => Unit = { case (op, io) =>
    ApiGatewayHandler(io)(ContinueProcessing(op))
  }
  def basicOp(fakeInvoiceTransactionSummary: InvoiceTransactionSummary = basicInvoiceTransactionSummary) = {
    PaymentFailureSteps.apply(
      ZuoraEmailSteps.sendEmailRegardingAccount(
        sendEmail = _ => GenericError("something failed!"),
        getInvoiceTransactions = _ => ClientSuccess(fakeInvoiceTransactionSummary),
      ),
      TestData.fakeApiConfig,
    )
  }

  it should "return error if message can't be queued" in {
    // set up
    val stream = getClass.getResourceAsStream("/paymentFailure/validRequest.json")

    var storedReq: Option[EmailMessage] = None
    val os = new ByteArrayOutputStream()

    // execute
    def configToFunction: Operation = {
      PaymentFailureSteps.apply(
        ZuoraEmailSteps.sendEmailRegardingAccount(
          { emailMessage =>
            storedReq = Some(emailMessage)
            GenericError("something failed!")
          },
          _ => ClientSuccess(basicInvoiceTransactionSummary),
        ),
        TestData.fakeApiConfig,
      )
    }
    apiGatewayHandler(configToFunction, LambdaIO(stream, os, null))

    // verify

    storedReq.isDefined should be(true)

    val responseString = new String(os.toByteArray(), "UTF-8")

    responseString jsonMatches emailFailureResponse
  }

  val couldNotFindDataForAccountResponse =
    """{
      |"statusCode":"500",
      |"headers":{"Content-Type":"application/json"},
      |"body":"{\n  \"message\" : \"Could not retrieve additional data for account accountId\"\n}"
      |}
      |""".stripMargin

  val missingEmailResponse =
    """{
      |"statusCode":"200",
      |"headers":{"Content-Type":"application/json"},
      |"body":"{\n  \"message\" : \"Email address not provided, email will not be sent\"\n}"
      |}
      |""".stripMargin

  val emailFailureResponse =
    """{
      |"statusCode":"500",
      |"headers":{"Content-Type":"application/json"},
      |"body":"{\n  \"message\" : \"email not sent for account accountId, error: something failed!\"\n}"
      |}
      |""".stripMargin

}

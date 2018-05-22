package com.gu.paymentFailure

import java.io.ByteArrayOutputStream

import com.gu.TestData
import com.gu.TestData._
import com.gu.stripeCustomerSourceUpdated.SourceUpdatedSteps.StepsConfig
import com.gu.util.config.ETConfig.ETSendId
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ApiGatewayResponse.ResponseBody
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayResponse}
import com.gu.util.config.Stage
import com.gu.util.exacttarget._
import com.gu.util.reader.Types._
import com.gu.util.zuora.ZuoraGetInvoiceTransactions.InvoiceTransactionSummary
import org.scalatest.{FlatSpec, Matchers}

import scalaz.{-\/, \/-}

class PaymentFailureHandlerTest extends FlatSpec with Matchers {

  "lambda" should "return error if credentials are missing" in {
    val stream = getClass.getResourceAsStream("/paymentFailure/missingCredentials.json")
    val os = new ByteArrayOutputStream()
    apiGatewayHandler(basicOp(), LambdaIO(stream, os, null))
    val responseString = new String(os.toByteArray(), "UTF-8")
    responseString jsonMatches missingCredentialsResponse
  }

  "lambda" should "return error if credentials don't match" in {
    val stream = getClass.getResourceAsStream("/paymentFailure/invalidCredentials.json")
    val os = new ByteArrayOutputStream()
    apiGatewayHandler(basicOp(), LambdaIO(stream, os, null))
    val responseString = new String(os.toByteArray(), "UTF-8")
    responseString jsonMatches missingCredentialsResponse
  }

  "lambda" should "return an error if tenant id doesn't match" in {
    val stream = getClass.getResourceAsStream("/paymentFailure/invalidTenant.json")
    val os = new ByteArrayOutputStream()
    apiGatewayHandler(basicOp(), LambdaIO(stream, os, null))
    val responseString = new String(os.toByteArray(), "UTF-8")
    responseString jsonMatches missingCredentialsResponse
  }

  "lambda" should "enqueue email and return success for a valid request" in {
    //set up
    val stream = getClass.getResourceAsStream("/paymentFailure/validRequest.json")
    var storedReq: Option[EmailRequest] = None

    val os = new ByteArrayOutputStream()
    //execute
    def configToFunction: Operation = {
      PaymentFailureSteps.apply(
        ZuoraEmailSteps.sendEmailRegardingAccount(

          EmailSendSteps.apply(

            req => {
              storedReq = Some(req)
              \/-(()): FailableOp[Unit]
            }, FilterEmail(Stage("PROD"))

          ),
          a => \/-(basicInvoiceTransactionSummary)

        ),
        TestData.fakeConfig.etConfig.etSendIDs,
        TestData.fakeConfig.trustedApiConfig
      )
    }
    apiGatewayHandler(configToFunction, LambdaIO(stream, os, null))

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
              subscriber_id = "A-S123",
              product = "Supporter",
              payment_method = "CreditCard",
              card_type = "Visa",
              card_expiry_date = "12/2017",
              first_name = "Test",
              last_name = "User",
              primaryKey = PaymentId("somePaymentId"),
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
    val invoiceTransactionSummary = InvoiceTransactionSummary(List())

    val os = new ByteArrayOutputStream()

    //execute
    apiGatewayHandler(basicOp(invoiceTransactionSummary), LambdaIO(stream, os, null))

    //verify
    val responseString = new String(os.toByteArray(), "UTF-8")

    responseString jsonMatches internalServerErrorResponse
  }

  def apiGatewayHandler: (Operation, LambdaIO) => Unit = {
    case (op, io) =>
      ApiGatewayHandler[StepsConfig](io)(\/-((TestData.fakeConfig, op)))
  }
  def basicOp(fakeInvoiceTransactionSummary: InvoiceTransactionSummary = basicInvoiceTransactionSummary) = {
    PaymentFailureSteps.apply(
      ZuoraEmailSteps.sendEmailRegardingAccount(
        sendEmail = _ => -\/(ApiGatewayResponse.internalServerError("something failed!")),
        getInvoiceTransactions = _ => \/-(fakeInvoiceTransactionSummary)
      ),
      TestData.fakeConfig.etConfig.etSendIDs,
      TestData.fakeConfig.trustedApiConfig
    )
  }

  "lambda" should "return error if message can't be queued" in {
    //set up
    val stream = getClass.getResourceAsStream("/paymentFailure/validRequest.json")

    var storedReq: Option[EmailRequest] = None
    val os = new ByteArrayOutputStream()

    //execute
    def configToFunction: Operation = {
      PaymentFailureSteps.apply(
        ZuoraEmailSteps.sendEmailRegardingAccount(
          EmailSendSteps.apply(
            req => {
              storedReq = Some(req)
              -\/(ApiGatewayResponse.internalServerError("something failed!")): FailableOp[Unit]
            }, FilterEmail(Stage("PROD"))
          ),
          a => \/-(basicInvoiceTransactionSummary)
        ),
        TestData.fakeConfig.etConfig.etSendIDs,
        TestData.fakeConfig.trustedApiConfig
      )
    }
    apiGatewayHandler(configToFunction, LambdaIO(stream, os, null))

    //verify

    storedReq.isDefined should be(true)

    val responseString = new String(os.toByteArray(), "UTF-8")

    responseString jsonMatches emailFailureResponse
  }

}

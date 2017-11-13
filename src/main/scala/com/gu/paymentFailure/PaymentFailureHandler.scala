package com.gu.paymentFailure

import java.io.{ InputStream, OutputStream }

import com.amazonaws.services.lambda.runtime.Context
import com.gu.util.apigateway.ApiGatewayHandler.LambdaConfig
import com.gu.util.zuora.Types._
import com.gu.util.zuora.Zuora.GetInvoiceTransactions
import com.gu.util._
import com.gu.util.apigateway.{ ApiGatewayHandler, ApiGatewayRequest }
import com.gu.util.exacttarget.EmailClient
import com.gu.util.zuora.{ Zuora, ZuoraRestRequestMaker }
import play.api.libs.json._

object PaymentFailureSteps extends Logging {

  def loggableData(callout: PaymentFailureCallout) = {
    s"accountId: ${callout.accountId}, paymentId: ${callout.paymentId}, failureNumber: ${callout.failureNumber}, paymentMethodType: ${callout.paymentMethodType}, currency: ${callout.currency}"
  }

  def performZuoraAction(sendDataExtensionToQueue: EmailClient.SendDataExtensionToQueue, getInvoiceTransactions: Zuora.GetInvoiceTransactions)(apiGatewayRequest: ApiGatewayRequest, config: Config): ZuoraOp[Unit] = {
    for {
      paymentFailureCallout <- Json.fromJson[PaymentFailureCallout](Json.parse(apiGatewayRequest.body)).toFailableOp.toZuoraOp
      _ = logger.info(s"received ${loggableData(paymentFailureCallout)}")
      _ <- ApiGatewayHandler.validateTenantCallout(paymentFailureCallout.tenantId, config.trustedApiConfig).toZuoraOp
      invoiceTransactionSummary <- getInvoiceTransactions(paymentFailureCallout.accountId)
      paymentInformation <- GetPaymentData(paymentFailureCallout.accountId)(invoiceTransactionSummary).toZuoraOp
      message = ToMessage(paymentFailureCallout, paymentInformation)
      _ <- sendDataExtensionToQueue(message).leftMap(resp => resp.copy(body = s"failed to enqueue message for account ${paymentFailureCallout.accountId}"))
    } yield ()
  }

}

object Lambda {

  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {

    // just wire up our dependencies

    val queueClient = EmailClient.sendDataExtensionToQueue

    def getInvoiceTransactions: GetInvoiceTransactions = Zuora.getInvoiceTransactions

    val stage = System.getenv("Stage")
    val configAttempt = Config.load(stage)
    val getZuoraRestService = configAttempt.map {
      config => new ZuoraRestRequestMaker(config.zuoraRestConfig, config.etConfig)
    }

    val lambdaConfig = LambdaConfig(configAttempt, stage, getZuoraRestService, PaymentFailureSteps.performZuoraAction(queueClient, getInvoiceTransactions))
    ApiGatewayHandler.handleRequest(inputStream, outputStream, context)(lambdaConfig)
  }

}

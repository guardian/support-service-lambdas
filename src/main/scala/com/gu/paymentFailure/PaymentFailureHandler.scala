package com.gu.paymentFailure

import java.io.{ InputStream, OutputStream }

import com.amazonaws.services.lambda.runtime.Context
import com.gu.effects.{ StateHttp, StateHttpImpl }
import com.gu.util._
import com.gu.util.apigateway.ApiGatewayHandler
import com.gu.util.apigateway.ApiGatewayHandler.LambdaConfig
import com.gu.util.exacttarget.EmailClient
import com.gu.util.zuora.Zuora
import com.gu.util.zuora.Zuora.GetInvoiceTransactions

object Lambda {

  def handleRequest(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {

    // just wire up our dependencies

    val queueClient = EmailClient.sendEmail

    def getInvoiceTransactions: GetInvoiceTransactions = Zuora.getInvoiceTransactions

    val stage = System.getenv("Stage")
    val configAttempt = Config.load(stage)
    val getZuoraRestService = configAttempt.map {
      config => new StateHttpImpl(config.zuoraRestConfig, config.etConfig)
    }

    val lambdaConfig = LambdaConfig(configAttempt, stage, getZuoraRestService, PaymentFailureSteps.performZuoraAction(queueClient, getInvoiceTransactions))
    ApiGatewayHandler.handleRequest(inputStream, outputStream, context)(lambdaConfig)
  }

}

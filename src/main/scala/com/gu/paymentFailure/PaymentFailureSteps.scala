package com.gu.paymentFailure

import com.gu.effects.Logging
import com.gu.util.Config
import com.gu.util.apigateway.{ ApiGatewayHandler, ApiGatewayRequest }
import com.gu.util.exacttarget.EmailClient
import com.gu.util.zuora.Types.{ ZuoraOp, _ }
import com.gu.util.zuora.Zuora
import play.api.libs.json.Json

object PaymentFailureSteps extends Logging {

  def loggableData(callout: PaymentFailureCallout) = {
    s"accountId: ${callout.accountId}, paymentId: ${callout.paymentId}, failureNumber: ${callout.failureNumber}, paymentMethodType: ${callout.paymentMethodType}, currency: ${callout.currency}"
  }

  def performZuoraAction(sendEmail: EmailClient.SendEmail, getInvoiceTransactions: Zuora.GetInvoiceTransactions)(apiGatewayRequest: ApiGatewayRequest, config: Config): ZuoraOp[Unit] = {
    for {
      paymentFailureCallout <- Json.fromJson[PaymentFailureCallout](Json.parse(apiGatewayRequest.body)).toFailableOp.toZuoraOp
      _ = logger.info(s"received ${loggableData(paymentFailureCallout)}")
      _ <- ApiGatewayHandler.validateTenantCallout(paymentFailureCallout.tenantId, config.trustedApiConfig).toZuoraOp
      invoiceTransactionSummary <- getInvoiceTransactions(paymentFailureCallout.accountId)
      paymentInformation <- GetPaymentData(paymentFailureCallout.accountId)(invoiceTransactionSummary).toZuoraOp
      message = ToMessage(paymentFailureCallout, paymentInformation)
      _ <- sendEmail(message).leftMap(resp => resp.copy(body = s"failed to enqueue message for account ${paymentFailureCallout.accountId}"))
    } yield ()
  }

}

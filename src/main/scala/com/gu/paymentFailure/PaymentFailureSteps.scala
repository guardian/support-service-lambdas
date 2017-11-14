package com.gu.paymentFailure

import com.gu.effects.Logging
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest}
import com.gu.util.exacttarget.EmailClient
import com.gu.util.zuora.Types.{ZuoraOp, _}
import com.gu.util.zuora.Zuora
import play.api.libs.json.Json

object PaymentFailureSteps extends Logging {

  def loggableData(callout: PaymentFailureCallout) = {
    s"accountId: ${callout.accountId}, paymentId: ${callout.paymentId}, failureNumber: ${callout.failureNumber}, paymentMethodType: ${callout.paymentMethodType}, currency: ${callout.currency}"
  }

  def performZuoraAction(deps: PFDeps = defaultPFDeps)(apiGatewayRequest: ApiGatewayRequest): ZuoraOp[Unit] = {
    for {
      paymentFailureCallout <- Json.fromJson[PaymentFailureCallout](Json.parse(apiGatewayRequest.body)).toFailableOp.toZuoraOp
      _ = logger.info(s"received ${loggableData(paymentFailureCallout)}")
      _ <- ApiGatewayHandler.validateTenantCallout(paymentFailureCallout.tenantId)
      invoiceTransactionSummary <- deps.getInvoiceTransactions(paymentFailureCallout.accountId)
      paymentInformation <- GetPaymentData(paymentFailureCallout.accountId)(invoiceTransactionSummary).toZuoraOp
      message = ToMessage(paymentFailureCallout, paymentInformation)
      _ <- deps.sendEmail(message).leftMap(resp => resp.copy(body = s"failed to enqueue message for account ${paymentFailureCallout.accountId}"))
    } yield ()
  }

  case class PFDeps(sendEmail: EmailClient.SendEmail, getInvoiceTransactions: Zuora.GetInvoiceTransactions)

  val defaultPFDeps = PFDeps(
    sendEmail = EmailClient.sendEmail(),
    getInvoiceTransactions = Zuora.getInvoiceTransactions
  )

}

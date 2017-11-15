package com.gu.paymentFailure

import com.gu.util.Logging
import com.gu.util.apigateway.{ ApiGatewayHandler, ApiGatewayRequest }
import com.gu.util.exacttarget.EmailSend
import com.gu.util.reader.Types.{ ConfigHttpFailableOp, _ }
import com.gu.util.zuora.Zuora
import play.api.libs.json.Json

object PaymentFailureSteps extends Logging {

  def loggableData(callout: PaymentFailureCallout) = {
    s"accountId: ${callout.accountId}, paymentId: ${callout.paymentId}, failureNumber: ${callout.failureNumber}, paymentMethodType: ${callout.paymentMethodType}, currency: ${callout.currency}"
  }

  def apply(deps: PFDeps = PFDeps())(apiGatewayRequest: ApiGatewayRequest): ConfigHttpFailableOp[Unit] = {
    for {
      paymentFailureCallout <- Json.fromJson[PaymentFailureCallout](Json.parse(apiGatewayRequest.body)).toFailableOp.toConfigHttpFailableOp
      _ = logger.info(s"received ${loggableData(paymentFailureCallout)}")
      _ <- ApiGatewayHandler.validateTenantCallout(paymentFailureCallout.tenantId)
      invoiceTransactionSummary <- deps.getInvoiceTransactions(paymentFailureCallout.accountId)
      paymentInformation <- GetPaymentData(paymentFailureCallout.accountId)(invoiceTransactionSummary).toConfigHttpFailableOp
      message = ToMessage(paymentFailureCallout, paymentInformation)
      _ <- deps.sendEmail(message).leftMap(resp => resp.copy(body = s"failed to enqueue message for account ${paymentFailureCallout.accountId}"))
    } yield ()
  }

  case class PFDeps(
    sendEmail: EmailSend.SendEmail = EmailSend(),
    getInvoiceTransactions: Zuora.GetInvoiceTransactions = Zuora.getInvoiceTransactions
  )

}

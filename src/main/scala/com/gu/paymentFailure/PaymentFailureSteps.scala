package com.gu.paymentFailure

import com.gu.util.apigateway.{ ApiGatewayHandler, ApiGatewayRequest }
import com.gu.util.exacttarget.EmailSend
import com.gu.util.reader.Types._
import com.gu.util.zuora.Zuora
import com.gu.util.{ Config, ETConfig, Logging }
import play.api.libs.json.Json

object PaymentFailureSteps extends Logging {

  def loggableData(callout: PaymentFailureCallout) = {
    s"accountId: ${callout.accountId}, paymentId: ${callout.paymentId}, failureNumber: ${callout.failureNumber}, paymentMethodType: ${callout.paymentMethodType}, currency: ${callout.currency}"
  }

  def apply(deps: PFDeps = PFDeps())(apiGatewayRequest: ApiGatewayRequest): all#ImpureFunctionsFailableOp[Unit] = {
    val temp: ExternalEffects[HttpAndConfig[Config]]#ImpureFunctionsFailableOp[PaymentFailureCallout] = Json.fromJson[PaymentFailureCallout](Json.parse(apiGatewayRequest.body)).toFailableOp.toConfigHttpFailableOp[HttpAndConfig[Config]]
    for {
      paymentFailureCallout <- temp
      _ = logger.info(s"received ${loggableData(paymentFailureCallout)}")
      _ <- ApiGatewayHandler.validateTenantCallout(paymentFailureCallout.tenantId)
      invoiceTransactionSummary <- deps.getInvoiceTransactions(paymentFailureCallout.accountId)
      paymentInformation <- GetPaymentData(paymentFailureCallout.accountId)(invoiceTransactionSummary).toConfigHttpFailableOp[HttpAndConfig[Config]]
      message = ToMessage(paymentFailureCallout, paymentInformation)
      _ <- deps.sendEmail(message).leftMap(resp => resp.copy(body = s"email not sent for account ${paymentFailureCallout.accountId}")).local[HttpAndConfig[Config]](allConfigHttp => HttpAndConfig[ETConfig](allConfigHttp.response, allConfigHttp.stage, allConfigHttp.config.etConfig))
    } yield ()
  }

  case class PFDeps(
    sendEmail: EmailSend.SendEmail = EmailSend(),
    getInvoiceTransactions: Zuora.GetInvoiceTransactions = Zuora.getInvoiceTransactions
  )

}

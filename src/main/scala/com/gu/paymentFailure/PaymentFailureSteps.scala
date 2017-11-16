package com.gu.paymentFailure

import com.gu.util.Auth.validTenant
import com.gu.util.apigateway.ApiGatewayHandler.StageAndConfigHttp
import com.gu.util.apigateway.{ ApiGatewayRequest, ResponseModels }
import com.gu.util.apigateway.ApiGatewayResponse.unauthorized
import com.gu.util.exacttarget.EmailSend
import com.gu.util.exacttarget.EmailSend.ETS
import com.gu.util.reader.Types._
import com.gu.util.zuora.Zuora
import com.gu.util.{ Logging, TrustedApiConfig }
import play.api.libs.json.Json

import scalaz.{ -\/, Reader, \/, \/- }

object PaymentFailureSteps extends Logging {

  def loggableData(callout: PaymentFailureCallout) = {
    s"accountId: ${callout.accountId}, paymentId: ${callout.paymentId}, failureNumber: ${callout.failureNumber}, paymentMethodType: ${callout.paymentMethodType}, currency: ${callout.currency}"
  }

  def apply(deps: PFDeps = PFDeps())(apiGatewayRequest: ApiGatewayRequest): WithDeps[StageAndConfigHttp]#FailableOp[Unit] = {
    for {
      paymentFailureCallout <- Json.fromJson[PaymentFailureCallout](Json.parse(apiGatewayRequest.body)).toFailableOp.toReader[StageAndConfigHttp]
      _ = logger.info(s"received ${loggableData(paymentFailureCallout)}")
      _ <- validateTenantCallout(paymentFailureCallout.tenantId).local[StageAndConfigHttp](_.config.trustedApiConfig).toDepsFailableOp
      invoiceTransactionSummary <- deps.getInvoiceTransactions(paymentFailureCallout.accountId)
      paymentInformation <- GetPaymentData(paymentFailureCallout.accountId)(invoiceTransactionSummary).toReader[StageAndConfigHttp]
      message = ToMessage(paymentFailureCallout, paymentInformation)
      _ <- deps.sendEmail(message).leftMap(resp => resp.copy(body = s"email not sent for account ${paymentFailureCallout.accountId}")).local[StageAndConfigHttp](x => ETS(x.response, x.config.stage, x.config.etConfig))
    } yield ()
  }

  def validateTenantCallout(calloutTenantId: String): Reader[TrustedApiConfig, FailableOp[Unit]] = Reader({ trustedApiConfig: TrustedApiConfig =>
    if (validTenant(trustedApiConfig, calloutTenantId)) \/-(()) else -\/(unauthorized)
  })

  case class PFDeps(
    sendEmail: EmailSend.SendEmail = EmailSend(),
    getInvoiceTransactions: Zuora.GetInvoiceTransactions = Zuora.getInvoiceTransactions
  )

}

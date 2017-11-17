package com.gu.paymentFailure

import com.gu.paymentFailure.GetPaymentData.PaymentFailureInformation
import com.gu.util.Auth.validTenant
import com.gu.util.apigateway.ApiGatewayHandler.StageAndConfigHttp
import com.gu.util.apigateway.{ ApiGatewayRequest, ApiGatewayResponse, ResponseModels }
import com.gu.util.apigateway.ApiGatewayResponse.unauthorized
import com.gu.util.exacttarget.{ EmailRequest, EmailSend, Message }
import com.gu.util.exacttarget.EmailSend.ETS
import com.gu.util.reader.Types._
import com.gu.util.zuora.Zuora
import com.gu.util.zuora.ZuoraModels.InvoiceTransactionSummary
import com.gu.util.{ ETConfig, Logging, TrustedApiConfig }
import play.api.libs.json.Json

import scalaz.{ -\/, Reader, \/, \/- }
import scalaz.syntax.std.option._

object PaymentFailureSteps extends Logging {

  def loggableData(callout: PaymentFailureCallout) = {
    s"accountId: ${callout.accountId}, paymentId: ${callout.paymentId}, failureNumber: ${callout.failureNumber}, paymentMethodType: ${callout.paymentMethodType}, currency: ${callout.currency}"
  }

  def apply(deps: PFDeps = PFDeps())(apiGatewayRequest: ApiGatewayRequest): WithDepsFailableOp[StageAndConfigHttp, Unit] = {
    for {
      paymentFailureCallout <- Json.fromJson[PaymentFailureCallout](Json.parse(apiGatewayRequest.body)).toFailableOp.toReader[StageAndConfigHttp]
      _ = logger.info(s"received ${loggableData(paymentFailureCallout)}")
      _ <- validateTenantCallout(paymentFailureCallout.tenantId).local[StageAndConfigHttp](_.config.trustedApiConfig).toDepsFailableOp
      request <- makeRequest(paymentFailureCallout).local[StageAndConfigHttp](_.config.etConfig).toDepsFailableOp
      _ <- sendEmailSteps(deps)(paymentFailureCallout.accountId, request)
    } yield ()
  }

  def makeRequest(paymentFailureCallout: PaymentFailureCallout): Reader[ETConfig, FailableOp[PaymentFailureInformation => EmailRequest]] = Reader { config =>
    config.etSendIDs.find(paymentFailureCallout.failureNumber).map { etId => pFI: PaymentFailureInformation => EmailRequest(etId, ToMessage(paymentFailureCallout, pFI))
    }.toRightDisjunction(ApiGatewayResponse.internalServerError(s"no ET id configured for failure number: ${paymentFailureCallout.failureNumber}"))
  }

  def sendEmailSteps(deps: PFDeps = PFDeps())(accountId: String, toMessage: PaymentFailureInformation => EmailRequest): WithDepsFailableOp[StageAndConfigHttp, Unit] = {
    for {
      invoiceTransactionSummary <- deps.getInvoiceTransactions(accountId)
      paymentInformation <- GetPaymentData(accountId)(invoiceTransactionSummary).toReader[StageAndConfigHttp]
      message = toMessage(paymentInformation)
      _ <- deps.sendEmail(message).leftMap(resp => resp.copy(body = s"email not sent for account ${accountId}")).local[StageAndConfigHttp](x => ETS(x.response, x.config.stage, x.config.etConfig))
    } yield ()
  }

  def validateTenantCallout(calloutTenantId: String): Reader[TrustedApiConfig, FailableOp[Unit]] = Reader({ trustedApiConfig: TrustedApiConfig =>
    if (validTenant(trustedApiConfig, calloutTenantId)) \/-(()) else -\/(unauthorized)
  })

  case class PFDeps(
    sendEmail: EmailSend.SendEmail = EmailSend(),
    getInvoiceTransactions: String => WithDepsFailableOp[StageAndConfigHttp, InvoiceTransactionSummary] = Zuora.getInvoiceTransactions
  )

}

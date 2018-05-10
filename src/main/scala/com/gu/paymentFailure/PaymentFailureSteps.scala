package com.gu.paymentFailure

import com.gu.paymentFailure.GetPaymentData.PaymentFailureInformation
import com.gu.util.apigateway.Auth.validTenant
import com.gu.util.config.ETConfig.ETSendIds
import com.gu.util._
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.ApiGatewayResponse.unauthorized
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.config.TrustedApiConfig
import com.gu.util.exacttarget.EmailRequest
import com.gu.util.reader.Types._
import com.gu.util.zuora.RestRequestMaker.ClientFailableOp
import com.gu.util.zuora.ZuoraGetInvoiceTransactions.InvoiceTransactionSummary
import play.api.libs.json.Json
import scalaz.syntax.std.option._
import scalaz.{-\/, \/-}

object PaymentFailureSteps extends Logging {

  def loggableData(callout: PaymentFailureCallout) = {
    s"accountId: ${callout.accountId}, paymentId: ${callout.paymentId}, failureNumber: ${callout.failureNumber}, paymentMethodType: ${callout.paymentMethodType}, currency: ${callout.currency}, billingDetails: ${callout.billingDetails}"
  }

  def apply(
    sendEmailRegardingAccount: (String, PaymentFailureInformation => EmailRequest) => FailableOp[Unit],
    etSendIDs: ETSendIds,
    trustedApiConfig: TrustedApiConfig
  ): Operation = Operation.noHealthcheck({ apiGatewayRequest: ApiGatewayRequest =>
    for {
      paymentFailureCallout <- Json.fromJson[PaymentFailureCallout](Json.parse(apiGatewayRequest.body)).toFailableOp
      _ = logger.info(s"received ${loggableData(paymentFailureCallout)}")
      _ <- validateTenantCallout(trustedApiConfig)(paymentFailureCallout.tenantId)
      request <- makeRequest(etSendIDs, paymentFailureCallout)
      _ <- sendEmailRegardingAccount(paymentFailureCallout.accountId, request)
    } yield ()
  })

  def makeRequest(etSendIds: ETSendIds, paymentFailureCallout: PaymentFailureCallout): FailableOp[PaymentFailureInformation => EmailRequest] = {
    etSendIds.find(paymentFailureCallout.failureNumber).map { etId => pFI: PaymentFailureInformation => EmailRequest(etId, ToMessage(paymentFailureCallout, pFI))
    }.toRightDisjunction(ApiGatewayResponse.internalServerError(s"no ET id configured for failure number: ${paymentFailureCallout.failureNumber}"))
  }

  def validateTenantCallout(trustedApiConfig: TrustedApiConfig)(calloutTenantId: String): FailableOp[Unit] = {
    if (validTenant(trustedApiConfig, calloutTenantId)) \/-(()) else -\/(unauthorized)
  }

}

object ZuoraEmailSteps {

  def sendEmailRegardingAccount(
    sendEmail: EmailRequest => FailableOp[Unit],
    getInvoiceTransactions: String => ClientFailableOp[InvoiceTransactionSummary]
  )(accountId: String, toMessage: PaymentFailureInformation => EmailRequest): FailableOp[Unit] = {
    for {
      invoiceTransactionSummary <- getInvoiceTransactions(accountId).leftMap(ZuoraToApiGateway.fromClientFail)
      paymentInformation <- GetPaymentData(accountId)(invoiceTransactionSummary)
      message = toMessage(paymentInformation)
      _ <- sendEmail(message).leftMap(resp => resp.copy(body = s"email not sent for account ${accountId}"))
    } yield ()
  }

}

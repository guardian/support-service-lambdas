package com.gu.paymentFailure

import com.gu.paymentFailure.GetPaymentData.PaymentFailureInformation
import com.gu.stripeCustomerSourceUpdated.TypeConvert._
import com.gu.util._
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.ApiGatewayResponse.{ResponseBody, toJsonBody, unauthorized}
import com.gu.util.apigateway.Auth.{TrustedApiConfig, validTenant}
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.config.EmailConfig.EmailSendIds
import com.gu.util.email.EmailMessage
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.reader.Types._
import com.gu.util.resthttp.Types.ClientFailableOp
import com.gu.util.zuora.ZuoraGetInvoiceTransactions.InvoiceTransactionSummary

object PaymentFailureSteps extends Logging {

  def loggableData(callout: PaymentFailureCallout) = {
    s"accountId: ${callout.accountId}, paymentId: ${callout.paymentId}, failureNumber: ${callout.failureNumber}, paymentMethodType: ${callout.paymentMethodType}, currency: ${callout.currency}, billingDetails: ${callout.billingDetails}"
  }

  def apply(
    sendEmailRegardingAccount: (String, PaymentFailureInformation => EmailMessage) => ApiGatewayOp[Unit],
    etSendIDs: EmailSendIds,
    trustedApiConfig: TrustedApiConfig
  ): Operation = Operation.noHealthcheck({ apiGatewayRequest: ApiGatewayRequest =>
    (for {
      paymentFailureCallout <- apiGatewayRequest.bodyAsCaseClass[PaymentFailureCallout]()
      _ = logger.info(s"received ${loggableData(paymentFailureCallout)}")
      _ <- validateTenantCallout(trustedApiConfig)(paymentFailureCallout.tenantId)
      request <- makeRequest(etSendIDs, paymentFailureCallout)
      _ <- sendEmailRegardingAccount(paymentFailureCallout.accountId, request)
    } yield ApiGatewayResponse.successfulExecution).apiResponse
  })

  def makeRequest(
    emailSendIds: EmailSendIds,
    paymentFailureCallout: PaymentFailureCallout
  ): ApiGatewayOp[PaymentFailureInformation => EmailMessage] = {
    val maybeEmailSendId = emailSendIds.find(paymentFailureCallout.failureNumber)
    maybeEmailSendId.map { emailSendId => pFI: PaymentFailureInformation =>
      ToMessage(paymentFailureCallout, pFI, emailSendId)
    }.toApiGatewayContinueProcessing(
      ApiGatewayResponse.internalServerError(s"no ET id configured for failure number: ${paymentFailureCallout.failureNumber}")
    )
  }

  def validateTenantCallout(trustedApiConfig: TrustedApiConfig)(calloutTenantId: String): ApiGatewayOp[Unit] = {
    if (validTenant(trustedApiConfig, calloutTenantId)) ContinueProcessing(()) else ReturnWithResponse(unauthorized)
  }

}

object ZuoraEmailSteps {

  def sendEmailRegardingAccount(
    sendEmail: EmailMessage => ApiGatewayOp[Unit],
    getInvoiceTransactions: String => ClientFailableOp[InvoiceTransactionSummary]
  )(accountId: String, toMessage: PaymentFailureInformation => EmailMessage): ApiGatewayOp[Unit] = {
    for {
      invoiceTransactionSummary <- getInvoiceTransactions(accountId).toApiGatewayOp("getInvoiceTransactions failed")
      paymentInformation <- GetPaymentData(accountId)(invoiceTransactionSummary)
      message = toMessage(paymentInformation)
      _ <- sendEmail(message).mapResponse(resp =>
        resp.copy(body = toJsonBody(ResponseBody(s"email not sent for account ${accountId}"))))
    } yield ()
  }

}
